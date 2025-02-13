/**
 * @file yields-layer
 * @copyright 2022-2024, Firaxis Games
 * @description Lens layer to show yields from each plot
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
class YieldsLensLayer {
    constructor() {
        this.yieldSpritePadding = 12;
        this.yieldSpriteGrid = WorldUI.createSpriteGrid("AllYields_SpriteGroup", true);
        this.yieldIcons = new Map();
        this.plotStates = [];
        this.plotConstructibles = [];
        this.revealedStates = [];
        this.plotsNeedingUpdate = [];
        this.fontData = { fonts: ["TitleFont"], fontSize: 5, faceCamera: true };
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
    }
    cacheIcons() {
        for (const y of GameInfo.Yields) {
            let icons = [];
            for (let i = 1; i < 6; ++i) {
                const icon = UI.getIconBLP(`${y.YieldType}_${i}`);
                icons.push(icon);
            }
            this.yieldIcons.set(y.$hash, icons);
        }
    }
    initLayer() {
        this.cacheIcons();
        this.revealedStates = GameplayMap.getRevealedStates(GameContext.localPlayerID);
        const revealedStatesLength = this.revealedStates.length;
        for (let i = 0; i < revealedStatesLength; ++i) {
            this.plotStates.push({ revealedState: RevealedStates.HIDDEN, yields: new Map() });
            this.plotConstructibles.push(0);
            this.updatePlotState(i, this.revealedStates[i]);
        }
        this.yieldSpriteGrid.setVisible(false);
        engine.on('PlotVisibilityChanged', this.onPlotVisibilityChanged, this);
        engine.on('PlotYieldChanged', this.onPlotYieldChanged, this);
        engine.on('ConstructibleAddedToMap', this.onConstructibleAddedToMap, this);
        engine.on('GameCoreEventPlaybackComplete', this.applyYieldChanges, this);
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
    }
    refreshLayer() {
        const revealedStatesLength = this.revealedStates.length;
        for (let i = 0; i < revealedStatesLength; ++i) {
            this.updatePlotState(i, this.revealedStates[i]);
        }
    }
    applyLayer() {
        this.refreshLayer()
        this.yieldSpriteGrid.setVisible(true);
    }
    removeLayer() {
        this.yieldSpriteGrid.setVisible(false);
    }
    onConstructibleAddedToMap(data) {
        const plotIndex = data.location.x + (GameplayMap.getGridWidth() * data.location.y);
        this.revealedStates[plotIndex] = data.visibility;
        if (this.plotsNeedingUpdate.indexOf(plotIndex) != null) {
            this.plotsNeedingUpdate.push(plotIndex);
        }
    }
    onPlotVisibilityChanged(data) {
        const plotIndex = data.location.x + (GameplayMap.getGridWidth() * data.location.y);
        this.revealedStates[plotIndex] = data.visibility;
        if (this.plotsNeedingUpdate.indexOf(plotIndex) != null) {
            this.plotsNeedingUpdate.push(plotIndex);
        }
    }
    onPlotYieldChanged(data) {
        const plotIndex = data.location.x + (GameplayMap.getGridWidth() * data.location.y);
        if (this.plotsNeedingUpdate.indexOf(plotIndex) != null) {
            this.plotsNeedingUpdate.push(plotIndex);
        }
    }
    applyYieldChanges() {
        for (const plotIndex of this.plotsNeedingUpdate) {
            this.updatePlotState(plotIndex, this.revealedStates[plotIndex]);
        }
        this.plotsNeedingUpdate.length = 0;
    }
    updatePlotState(plotIndex, revealedState) {
        let state = this.plotStates[plotIndex];
        const oldRevealedState = state.revealedState;
        if (revealedState == null) {
            revealedState = oldRevealedState;
        }

        const plot = GameplayMap.getLocationFromIndex(plotIndex);
        const oldConstructibles = this.plotConstructibles[plotIndex];
        const newConstructibles = (MapConstructibles.getConstructibles(plot.x, plot.y)).length;
        this.plotConstructibles[plotIndex] = newConstructibles;

        // Fast path to handle hidden state and avoid fetching yields.
        if (revealedState == RevealedStates.HIDDEN) {
            if (revealedState != oldRevealedState) {
                this.yieldSpriteGrid.clearPlot(plotIndex);
                state.revealedState = revealedState;
                state.yields.clear();
            }
        }
        else {
            let needsRefresh = false;
            const yields = GameplayMap.getYields(plotIndex, GameContext.localPlayerID);
            // If the revealed states diff, we have to refresh.
            if (oldRevealedState != revealedState) {
                needsRefresh = true;
            }
            else if (oldConstructibles != newConstructibles) {
                needsRefresh = true;
            }
            else {
                // Revealed states are the same, compare yields.
                if (state.yields.size != yields.length) {
                    needsRefresh = true;
                }
                else {
                    for (const [yieldType, yieldAmount] of yields) {
                        if (state.yields.get(yieldType) != yieldAmount) {
                            needsRefresh = true;
                            break;
                        }
                    }
                }
            }
            if (needsRefresh) {
                // Reset plot state.	
                state.yields.clear();
                state.revealedState = revealedState;
                // Add yield icons and amounts to sprite grid
                let position = { x: 0, y: 0, z: 2 };
                const plot = GameplayMap.getLocationFromIndex(plotIndex);
                const constructibles = MapConstructibles.getConstructibles(plot.x, plot.y);
                const scale = (constructibles.length > 0) ? 1.0 : 0.66;
                const groupWidth = (yields.length - 1) * this.yieldSpritePadding * scale;
                const groupOffset = (groupWidth / 2) - groupWidth;
                this.yieldSpriteGrid.clearPlot(plotIndex);
                let count = 0;
                for (const [yieldType, yieldAmount] of yields) {
                    state.yields.set(yieldType, yieldAmount);
                    const yieldDef = GameInfo.Yields.lookup(yieldType);
                    if (yieldDef) {
                        position.x = (count * this.yieldSpritePadding * scale) + groupOffset;
                        const icons = this.yieldIcons.get(yieldType);
                        if (icons) {
                            if (yieldAmount >= 5) {
                                this.yieldSpriteGrid.addSprite(plotIndex, icons[4], position, { scale: scale });
                                this.yieldSpriteGrid.addText(plotIndex, yieldAmount.toString(), position, this.fontData);
                            }
                            else {
                                this.yieldSpriteGrid.addSprite(plotIndex, icons[yieldAmount - 1], position, { scale: scale });
                            }
                            ++count;
                        }
                    }
                }
            }
        }
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-yields-layer') {
            LensManager.toggleLayer('fxs-yields-layer');
        }
    }
}
LensManager.registerLensLayer('fxs-yields-layer', new YieldsLensLayer());

//# sourceMappingURL=file:///base-standard/ui/lenses/layer/yields-layer.js.map
