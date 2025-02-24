/**
 * @file building-placement-layer
 * @copyright 2023, Firaxis Games
 * @description Lens layer to show yield deltas and adjacencies from placing a building
 */
import BuildingPlacementManager, { BuildingPlacementHoveredPlotChangedEventName } from '/base-standard/ui/building-placement/building-placement-manager.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import { SortYields } from '/base-standard/ui/utilities/utilities-city-yields.js';
const adjacencyIcons = new Map([
    [DirectionTypes.DIRECTION_EAST, "adjacencyarrow_east"],
    [DirectionTypes.DIRECTION_NORTHEAST, "adjacencyarrow_northeast"],
    [DirectionTypes.DIRECTION_NORTHWEST, "adjacencyarrow_northwest"],
    [DirectionTypes.DIRECTION_SOUTHEAST, "adjacencyarrow_southeast"],
    [DirectionTypes.DIRECTION_SOUTHWEST, "adjacencyarrow_southwest"],
    [DirectionTypes.DIRECTION_WEST, "adjacencyarrow_west"]
]);
class WorkerYieldsLensLayer {
    constructor() {
        this.BUILD_SLOT_SPRITE_PADDING = 12;
        this.YIELD_SPRITE_PADDING = 11;
        this.YIELD_WRAP_AT = 3;
        this.YIELD_WRAPPED_ROW_OFFSET = 8;
        this.yieldSpriteGrid = WorldUI.createSpriteGrid("BuildingPlacementYields_SpriteGroup", true);
        this.adjacenciesSpriteGrid = WorldUI.createSpriteGrid("Adjacencies_SpriteGroup", true);
        this.buildingPlacementPlotChangedListener = () => { this.onBuildingPlacementPlotChanged(); };
    }
    initLayer() {
        this.yieldSpriteGrid.setVisible(false);
        this.adjacenciesSpriteGrid.setVisible(false);
    }
    applyLayer() {
        this.realizeBuidlingPlacementSprites();
        this.yieldSpriteGrid.setVisible(true);
        window.addEventListener(BuildingPlacementHoveredPlotChangedEventName, this.buildingPlacementPlotChangedListener);
    }
    removeLayer() {
        this.yieldSpriteGrid.clear();
        this.yieldSpriteGrid.setVisible(false);
        this.adjacenciesSpriteGrid.clear();
        this.adjacenciesSpriteGrid.setVisible(false);
        window.removeEventListener(BuildingPlacementHoveredPlotChangedEventName, this.buildingPlacementPlotChangedListener);
    }
    /** Add the yield deltas and building slots to each valid plot for the current building */
    realizeBuidlingPlacementSprites() {
        if (!BuildingPlacementManager.cityID) {
            console.error("building-placement-layer: No assigned cityID in the BuildingPlacementManager when attempting to realizeBuildingPlacementSprites");
            return;
        }
        if (!BuildingPlacementManager.currentConstructible) {
            console.error("building-placement-layer: No assigned currentConstructible in the BuildingPlacementManager when attempting to realizeBuildingPlacementSprites");
            return;
        }
        const city = Cities.get(BuildingPlacementManager.cityID);
        if (!city) {
            console.error("building-placement-layer: No valid city with city ID: " + ComponentID.toLogString(BuildingPlacementManager.cityID));
            return;
        }
        if (!city.Yields) {
            console.error("building-placement-layer: No valid Yields object attached to city with city ID: " + ComponentID.toLogString(BuildingPlacementManager.cityID));
            return;
        }
        const validPlots = BuildingPlacementManager.expandablePlots.concat(BuildingPlacementManager.developedPlots.concat(BuildingPlacementManager.urbanPlots));
        for (let i = 0; i < validPlots.length; i++) {
            const plotYieldGainPills = [];
            const plotYieldLossPills = [];
            //Add the yield gain and loss pills
            BuildingPlacementManager.getTotalYieldChanges(validPlots[i])?.forEach((yieldChangeInfo) => {
                if (yieldChangeInfo.yieldChange != 0) {
                    const yieldPillData = {
                        iconURL: BuildingPlacementManager.getYieldPillIcon(yieldChangeInfo.yieldType.toString(), yieldChangeInfo.yieldChange, yieldChangeInfo.isMainYield),
                        yieldDelta: yieldChangeInfo.yieldChange,
                        yieldType: yieldChangeInfo.yieldType,
                        isMainYield: yieldChangeInfo.isMainYield
                    };
                    if (yieldChangeInfo.yieldChange > 0) {
                        plotYieldGainPills.push(yieldPillData);
                    }
                    else {
                        plotYieldLossPills.push(yieldPillData);
                    }
                }
            });
            SortYields(plotYieldGainPills);
            SortYields(plotYieldLossPills);
            const pillOffsets = this.getXYOffsetForPill(plotYieldGainPills.length + plotYieldLossPills.length);
            const location = GameplayMap.getLocationFromIndex(validPlots[i]);
            plotYieldGainPills.forEach((yieldPillData, i) => {
                const pillOffset = pillOffsets[i];
                this.yieldSpriteGrid.addSprite(location, yieldPillData.iconURL, { x: pillOffset.x, y: pillOffset.y, z: 5 });
                this.yieldSpriteGrid.addText(location, yieldPillData.yieldDelta.toString(), { x: pillOffset.x, y: (pillOffset.y - 3), z: 5 }, { fonts: ["TitleFont"], fontSize: 4, faceCamera: true });
            });
            plotYieldLossPills.forEach((yieldPillData, i) => {
                const pillOffset = pillOffsets[i + plotYieldGainPills.length];
                this.yieldSpriteGrid.addSprite(location, yieldPillData.iconURL, { x: pillOffset.x, y: pillOffset.y, z: 5 });
                this.yieldSpriteGrid.addText(location, yieldPillData.yieldDelta.toString(), { x: pillOffset.x, y: (pillOffset.y - 3), z: 5 }, { fonts: ["TitleFont"], fontSize: 4, faceCamera: true });
            });
            //Add any filled or open building slots
            const district = Districts.getAtLocation(validPlots[i]);
            if (district) {
                this.realizeBuildSlots(district);
            }
        }
    }
    /**
     * Returns an array of offsets for yield pills for totalPills count passed in
     * Will wrap to 2 lines once hitting a limit but won't wrap more than once
     * @param totalPills total number of yield pills that will be displayed on the tile
     * @returns array of offsets indexed to the sourced array of pills. ie: 3rd pill (index of 2) offset at offsetArray[2]
     */
    getXYOffsetForPill(totalPills) {
        let offsets = [];
        // Determine if we should wrap and if so how many pills in the top and bottom rows
        const shouldWrap = totalPills > this.YIELD_WRAP_AT;
        const numPillsBottomRow = shouldWrap ? Math.trunc(totalPills / 2) : 0;
        const numPillsTopRow = totalPills - numPillsBottomRow;
        // Group width based on top row which should always be the longest row
        const groupWidth = (numPillsTopRow - 1) * this.YIELD_SPRITE_PADDING;
        for (let i = 0; i < totalPills; i++) {
            const isPillInTopRow = (i + 1) <= numPillsTopRow;
            // If this pill is in the bottom row base the index for positioning off relative index within the bottom row
            const rowPosition = isPillInTopRow ? i : i - numPillsTopRow;
            // Generate y offset based on if we need to wrap and what row the pill is in
            let yOffset = 0;
            if (shouldWrap) {
                yOffset = isPillInTopRow ? this.YIELD_WRAPPED_ROW_OFFSET : -this.YIELD_WRAPPED_ROW_OFFSET;
            }
            const offset = {
                x: (rowPosition * this.YIELD_SPRITE_PADDING) + (groupWidth / 2) - groupWidth,
                y: yOffset
            };
            offsets.push(offset);
        }
        return offsets;
    }
    realizeBuildSlots(district) {
        const districtDefinition = GameInfo.Districts.lookup(district.type);
        if (!districtDefinition) {
            console.error("building-placement-layer: Unable to retrieve a valid DistrictDefinition with DistrictType: " + district.type);
            return;
        }
        const constructibles = MapConstructibles.getConstructibles(district.location.x, district.location.y);
        const buildingSlots = [];
        for (let i = 0; i < constructibles.length; i++) {
            const constructibleID = constructibles[i];
            const existingConstructible = Constructibles.getByComponentID(constructibleID);
            if (!existingConstructible) {
                console.error("building-placement-layer: Unable to find a valid Constructible with ComponentID: " + ComponentID.toLogString(constructibleID));
                continue;
            }
            const constructibleDefinition = GameInfo.Constructibles.lookup(existingConstructible.type);
            if (!constructibleDefinition) {
                console.error("building-placement-layer: Unable to find a valid ConstructibleDefinition with type: " + existingConstructible.type);
                continue;
            }
            //TODO: add completion turns to in progress buildings once asset is implemented
            //TODO: add replaceable once asset is implemented
            const iconString = UI.getIconBLP(constructibleDefinition.ConstructibleType);
            buildingSlots.push({ iconURL: iconString ? iconString : "" });
        }
        for (let i = 0; i < districtDefinition.MaxConstructibles; i++) {
            const groupWidth = (districtDefinition.MaxConstructibles - 1) * this.BUILD_SLOT_SPRITE_PADDING;
            const xPos = (i * this.BUILD_SLOT_SPRITE_PADDING) + (groupWidth / 2) - groupWidth;
            this.yieldSpriteGrid.addSprite(district.location, UI.getIconBLP('BUILDING_UNFILLED'), { x: xPos, y: -28, z: 0 });
            if (buildingSlots[i]) {
                this.yieldSpriteGrid.addSprite(district.location, buildingSlots[i].iconURL, { x: xPos, y: -27.5, z: 0 }, { scale: 0.7 });
            }
        }
    }
    onBuildingPlacementPlotChanged() {
        this.adjacenciesSpriteGrid.clear();
        this.adjacenciesSpriteGrid.setVisible(false);
        if (!BuildingPlacementManager.cityID) {
            console.error("building-placement-layer: No assigned cityID in the BuildingPlacementManager when attempting to realizeBuildingPlacementSprites");
            return;
        }
        if (!BuildingPlacementManager.currentConstructible) {
            console.error("building-placement-layer: No assigned currentConstructible in the BuildingPlacementManager when attempting to realizeBuildingPlacementSprites");
            return;
        }
        const city = Cities.get(BuildingPlacementManager.cityID);
        if (!city) {
            console.error("building-placement-layer: No valid city with city ID: " + ComponentID.toLogString(BuildingPlacementManager.cityID));
            return;
        }
        if (!city.Yields) {
            console.error("building-placement-layer: No valid Yields object attached to city with city ID: " + ComponentID.toLogString(BuildingPlacementManager.cityID));
            return;
        }
        if (!BuildingPlacementManager.hoveredPlotIndex || !BuildingPlacementManager.isValidPlacementPlot(BuildingPlacementManager.hoveredPlotIndex)) {
            return;
        }
        const yieldAdjacencies = city.Yields.calculateAllAdjacencyYieldsForConstructible(BuildingPlacementManager.currentConstructible.ConstructibleType, BuildingPlacementManager.hoveredPlotIndex);
        if (yieldAdjacencies.length <= 0) {
            return;
        }
        yieldAdjacencies.forEach(adjacency => {
            const yieldDef = GameInfo.Yields.lookup(adjacency.yieldType);
            if (!yieldDef) {
                console.error("building-placement-layer: No valid yield definition for yield type: " + adjacency.yieldType.toString());
                return;
            }
            const adjacencyLocation = GameplayMap.getLocationFromIndex(adjacency.sourcePlotIndex);
            const buildingLocation = GameplayMap.getLocationFromIndex(BuildingPlacementManager.hoveredPlotIndex);
            const adjacencyDirection = GameplayMap.getDirectionToPlot(buildingLocation, adjacencyLocation);
            const adjacencyIcon = adjacencyIcons.get(adjacencyDirection);
            if (adjacencyIcon === undefined) {
                console.error("building-placement-layer: No valid adjacency icon for direction: " + adjacencyDirection.toString());
                return;
            }
            const iconOffset = this.calculateAdjacencyDirectionOffsetLocation(adjacencyDirection);
            //scale -1 to flip the arrows to indicate incoming adjacencies
            this.adjacenciesSpriteGrid.addSprite(buildingLocation, adjacencyIcon, { x: iconOffset.x, y: iconOffset.y, z: 0 }, { scale: -1 });
            this.adjacenciesSpriteGrid.addSprite(buildingLocation, UI.getIcon(yieldDef.YieldType + "_1", "YIELD"), { x: iconOffset.x, y: iconOffset.y, z: 1 }, { scale: 1 });
            //TODO: outgoing adjacencies once implemented in GameCore
        });
        this.adjacenciesSpriteGrid.setVisible(true);
    }
    calculateAdjacencyDirectionOffsetLocation(adjacencyDirection) {
        //TODO: Will need to be shifted once outgoing adjacencies are displayed
        switch (adjacencyDirection) {
            case DirectionTypes.DIRECTION_EAST:
                return { x: 32, y: 0 };
            case DirectionTypes.DIRECTION_WEST:
                return { x: -32, y: 0 };
            case DirectionTypes.DIRECTION_NORTHEAST:
                return { x: 16, y: 28 };
            case DirectionTypes.DIRECTION_NORTHWEST:
                return { x: -16, y: 28 };
            case DirectionTypes.DIRECTION_SOUTHEAST:
                return { x: 16, y: -28 };
            case DirectionTypes.DIRECTION_SOUTHWEST:
                return { x: -16, y: -28 };
            default:
                return { x: 32, y: 0 };
        }
    }
}
LensManager.registerLensLayer('fxs-building-placement-layer', new WorkerYieldsLensLayer());

//# sourceMappingURL=file:///base-standard/ui/lenses/layer/building-placement-layer.js.map
