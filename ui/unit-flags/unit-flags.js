/**
 * @file unit-flags.ts
 * @copyright 2021-2024, Firaxis Games
 * @description Generic unit flag implementation; the default unit flag if no specific one is found.
 * The flag manages the lifetime and update of any additional 3D pieces and/or overlays.
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { UnitFlagFactory, UnitFlagManager } from '/base-standard/ui/unit-flags/unit-flag-manager.js';
import { utils } from '/core/ui/graph-layout/utils.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
class GenericFlagMaker {
    initialize() {
    }
    isMatch(unit, unitDefinition, others) {
        if (!others) { // If no others are passed in, then this will handle as a default.
            return true;
        }
        if (others.length < 1) { // empty or just filled with refernce to self
            return true;
        }
        const betterMatch = others.some((factory) => {
            if (factory === this) { // Ignore self.
                return false;
            }
            return factory.isMatch(unit, unitDefinition); // will return on first true
        });
        if (betterMatch) { // if a differnt factory said it was a match, assume it's better than this default one
            return false;
        }
        return true;
    }
    getComponentName() {
        return "unit-flag";
    }
}
export class GenericUnitFlag extends Component {
    constructor() {
        super(...arguments);
        this._componentID = ComponentID.getInvalidID();
        this._worldAnchor = null;
        this._isManagerTracked = true;
        this.engineInputListener = this.onEngineInput.bind(this);
        this.beforeUnloadListener = this.onUnload.bind(this);
        this.isHidden = false;
        // Healthbar color threshholds, sync any updates to interact-unit.ts
        this.MEDIUM_HEALTH_THRESHHOLD = .75;
        this.LOW_HEALTH_THRESHHOLD = .5;
        this.unitContainer = null;
        this.unitHealthBar = null;
        this.unitHealthBarInner = null;
        this.unitFlagIcon = null;
    }
    onAttach() {
        super.onAttach();
        this.Root.classList.add("flex", "flex-col", "justify-center", "items-center", "absolute", "opacity-100");
        const id = this.Root.getAttribute('unit-id');
        this._componentID = ComponentID.fromString(id);
        this._isManagerTracked = this.Root.getAttribute('manager-tracked') != "false";
        // Obtain player colors used later on.
        let playerColorPri = 'rgb(0, 0, 0)';
        let playerColorSec = 'rgb(255, 255, 255)';
        if (Players.isValid(this.componentID.owner)) {
            playerColorPri = UI.Player.getPrimaryColorValueAsString(this.componentID.owner);
            playerColorSec = UI.Player.getSecondaryColorValueAsString(this.componentID.owner);
        }
        const unitFlagContainer = document.createElement('div');
        unitFlagContainer.classList.add('unit-flag__container', 'absolute', '-top-6', '-left-6', 'pointer-events-auto', 'flex', 'flex-col', 'justify-center', 'items-center', 'w-12', 'h-12');
        this.unitContainer = unitFlagContainer;
        const unitFlagShadow = document.createElement('div');
        unitFlagShadow.classList.add('unit-flag__shadow', 'pointer-events-none', 'absolute', 'inset-0', 'bg-cover');
        unitFlagContainer.appendChild(unitFlagShadow);
        if (this.componentID.owner == GameContext.localObserverID) {
            const unitFlagHighlight = document.createElement('div');
            unitFlagHighlight.classList.add('unit-flag__highlight', 'opacity-0', 'pointer-events-none', 'absolute', 'bg-no-repeat');
            unitFlagContainer.appendChild(unitFlagHighlight);
        }
        const unitFlagInnerShape = document.createElement('div');
        unitFlagInnerShape.classList.add('unit-flag__shape', 'unit-flag__shape--inner', "pointer-events-none", "absolute", "inset-0", "bg-no-repeat");
        unitFlagInnerShape.style.fxsBackgroundImageTint = playerColorPri;
        unitFlagContainer.appendChild(unitFlagInnerShape);
        const unitFlagOuterShape = document.createElement('div');
        unitFlagOuterShape.classList.add('unit-flag__shape', 'unit-flag__shape--outer', "pointer-events-none", "absolute", "inset-0", "bg-no-repeat");
        unitFlagOuterShape.style.fxsBackgroundImageTint = playerColorSec;
        unitFlagContainer.appendChild(unitFlagOuterShape);
        const unitFlagHealthbarContainer = document.createElement('div');
        unitFlagHealthbarContainer.classList.add('unit-flag__healthbar-container', 'absolute', 'h-full', 'self-center', 'pointer-events-none');
        unitFlagContainer.appendChild(unitFlagHealthbarContainer);
        const unitFlagHealthbar = document.createElement('div');
        unitFlagHealthbar.classList.add('unit-flag__healthbar', 'absolute', 'h-1', 'bg-black');
        unitFlagHealthbarContainer.appendChild(unitFlagHealthbar);
        this.unitHealthBar = unitFlagHealthbar;
        const unitFlagHealthbarInner = document.createElement('div');
        unitFlagHealthbarInner.classList.add('unit-flag__healthbar-inner', 'absolute', 'h-full', 'bg-no-repeat');
        unitFlagHealthbar.appendChild(unitFlagHealthbarInner);
        this.unitHealthBarInner = unitFlagHealthbarInner;
        const unitFlagIcon = document.createElement('div');
        unitFlagIcon.classList.add('unit-flag__icon', 'pointer-events-none', 'absolute', 'bg-contain', 'bg-no-repeat');
        unitFlagIcon.style.fxsBackgroundImageTint = playerColorSec;
        unitFlagContainer.appendChild(unitFlagIcon);
        this.unitFlagIcon = unitFlagIcon;
        const unitFlagPromotionNumber = document.createElement('div');
        unitFlagPromotionNumber.classList.add('unit-flag__promotion-number', 'font-body', 'text-2xs', 'absolute', 'text-center');
        unitFlagPromotionNumber.style.color = playerColorSec;
        unitFlagContainer.appendChild(unitFlagPromotionNumber);
        const unitFlagTierGraphic = document.createElement('div');
        unitFlagTierGraphic.classList.add('unit-flag__tier-graphic', 'absolute', 'w-4', 'h-4', 'left-4', 'right-0', 'bottom-0', 'bg-cover', 'bg-no-repeat');
        const unit = Units.get(this.componentID);
        if (unit) {
            const unitDefinition = GameInfo.Units.lookup(unit.type);
            if (unitDefinition && unitDefinition.Tier) {
                unitFlagTierGraphic.style.backgroundImage = `url('fs://game/unit_chevron-0${unitDefinition.Tier}.png')`;
            }
        }
        unitFlagContainer.appendChild(unitFlagTierGraphic);
        const unitFlagArmyStats = document.createElement('div');
        unitFlagArmyStats.classList.add('unit-flag__army-stats"', 'items-center', 'text-center', 'absolute', '-left-3', '-right-3', 'bg-transparent');
        unitFlagContainer.appendChild(unitFlagArmyStats);
        this.Root.appendChild(unitFlagContainer);
        engine.on('BeforeUnload', this.beforeUnloadListener);
        if (this._isManagerTracked) {
            const manager = UnitFlagManager.instance;
            manager.addChildForTracking(this);
        }
        // Sanity check early on (subsequent unit calls will be from componentID in getter)
        if (!unit) {
            console.error("Could not attach unit flag; no unit object for cid: ", ComponentID.toLogString(this.componentID));
            return;
        }
        this.Root.addEventListener('engine-input', this.engineInputListener);
        if (this._isManagerTracked) {
            this.makeWorldAnchor(this.componentID);
        }
        if (unit.Movement) {
            this.setMovementPoints(unit.Movement.movementMovesRemaining);
        }
        this.realizeIcon();
        this.realizeUnitHealth();
        this.realizeTooltip();
        this.realizePromotions();
        if (unit) {
            const location = unit.location;
            const revealedState = GameplayMap.getRevealedState(GameContext.localObserverID, location.x, location.y);
            if (!this.isHidden) {
                this.setVisibility(revealedState);
            }
        }
        else {
            this.setVisibility(RevealedStates.HIDDEN);
        }
        if (this._isManagerTracked) {
            this.checkUnitPosition(unit);
        }
    }
    onUnload() {
        this.cleanup();
    }
    onDetach() {
        this.cleanup();
        super.onDetach();
    }
    cleanup() {
        if (this._isManagerTracked) {
            const manager = UnitFlagManager.instance;
            manager.removeChildFromTracking(this);
            engine.off('BeforeUnload', this.beforeUnloadListener);
            this.destroyWorldAnchor();
        }
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        this._componentID = ComponentID.getInvalidID();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (this.unitContainer?.classList.contains("disabled")) {
            return;
        }
        if (inputEvent.detail.name == "accept" || inputEvent.detail.name == "mousebutton-left" || inputEvent.detail.name == "touch-tap") {
            if (ComponentID.isInvalid(this._componentID)) {
                console.warn("Attempt to activate a unit-flag but invalid associated unit.");
                return;
            }
            // Has to be the owner or need to be pure observer
            if (GameContext.localObserverID != this._componentID.owner && (GameContext.localObserverID != PlayerIds.OBSERVER_ID)) {
                return;
            }
            UI.Player.selectUnit(this._componentID);
            window.dispatchEvent(new SetActivatedComponentEvent(null));
            this.Root.dispatchEvent(new ActionActivateEvent(inputEvent.detail.x, inputEvent.detail.y));
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    hide() {
        this.isHidden = true;
        this.unitContainer?.classList.add("hidden");
    }
    show() {
        this.isHidden = false;
        if (this.unit) {
            const location = this.unit.location;
            const revealedState = GameplayMap.getRevealedState(GameContext.localObserverID, location.x, location.y);
            this.setVisibility(revealedState);
        }
    }
    disable() {
        this.unitContainer?.classList.add("disabled");
    }
    enable() {
        this.unitContainer?.classList.remove("disabled");
    }
    realizeUnitHealth() {
        if (!this.unitHealthBar) {
            console.error("unit-flags: realizeUnitHealth(): Missing this.unitHealthBar with '.unit-flag__healthbar'. cid: " + ComponentID.toLogString(this.componentID));
            return;
        }
        let unit = this.unit;
        // reset health stats
        this.unitHealthBar.classList.toggle("unit-flag__healthbar-med-health", false);
        this.unitHealthBar.classList.toggle("unit-flag__healthbar-low-health", false);
        let damage = 1.0;
        if (unit?.Health) {
            damage = (unit.Health.maxDamage - unit.Health.damage) / unit.Health.maxDamage;
            this.unitContainer?.classList.toggle("unit-flag--with-healthbar", (unit.Health.damage > 0));
            if (damage <= this.MEDIUM_HEALTH_THRESHHOLD && damage >= this.LOW_HEALTH_THRESHHOLD) {
                this.unitContainer?.classList.toggle("unit-flag__healthbar-med-health", true);
                this.unitContainer?.classList.toggle("unit-flag__healthbar-low-health", false);
            }
            else if (damage < this.LOW_HEALTH_THRESHHOLD) {
                this.unitContainer?.classList.toggle("unit-flag__healthbar-med-health", false);
                this.unitContainer?.classList.toggle("unit-flag__healthbar-low-health", true);
            }
            else {
                this.unitContainer?.classList.toggle("unit-flag__healthbar-med-health", false);
                this.unitContainer?.classList.toggle("unit-flag__healthbar-low-health", false);
            }
        }
        if (this.unitHealthBarInner) {
            this.unitHealthBarInner.style.widthPERCENT = utils.clamp(damage, 0, 1) * 100;
        }
    }
    realizeIcon() {
        const unit = this.unit;
        if (!unit) {
            console.error("Unit flag finished loading its HTML content but is not associated with a valid unit. cid: ", ComponentID.toLogString(this.componentID));
            return;
        }
        const unitDefinition = GameInfo.Units.lookup(unit.type);
        if (!unitDefinition) {
            console.warn("unit-flags: Cannot set unit flag icon due to missing Unit Definition. type: ", unit.type, "  cid: ", ComponentID.toLogString(this.componentID));
            return;
        }
        if (unit.isArmyCommander) {
            this.unitContainer?.classList.add('unit-flag--army');
        }
        else if (unit.Combat?.canAttack) {
            this.unitContainer?.classList.add('unit-flag--combat');
        }
        else if (unitDefinition.CoreClass != "CORE_CLASS_SUPPORT" && unitDefinition.CoreClass != "CORE_CLASS_RECON") {
            this.unitContainer?.classList.add('unit-flag--civilian');
        }
        if (this.unitFlagIcon) {
            const iconName = Icon.getUnitIconFromDefinition(unitDefinition);
            this.unitFlagIcon.style.backgroundImage = `url(${iconName})`;
        }
        this.unitContainer?.classList.toggle('owned-unit', (this.componentID.owner == GameContext.localObserverID));
    }
    realizeTooltip() {
        const playerId = this.componentID.owner;
        const player = Players.get(playerId);
        if (player) {
            const playerName = Locale.compose(player.name);
            let unit = this.unit;
            let unitName = ((unit) ? Locale.compose(unit.name) : "ERROR, unit: " + ComponentID.toLogString(this._componentID));
            const tooltipDiv = this.Root.querySelector('.unit-flag__container');
            if (tooltipDiv) {
                tooltipDiv.setAttribute("data-tooltip-content", `<div>${playerName}</div><div>${unitName}</div>`);
            }
        }
    }
    realizePromotions() {
        const unitDefinition = GameInfo.Units.lookup(this.unit.type);
        if (!unitDefinition) {
            console.warn("unit-flag: Cannot set promotions due to missing Unit Definition. type: ", this.unit.type, "  cid: ", ComponentID.toLogString(this.componentID));
            return;
        }
        if (!unitDefinition.CanEarnExperience) {
            //Don't even check for promotions if we can't earn experience!
            return;
        }
        const promotionContainer = MustGetElement(".unit-flag__promotion-number", this.Root);
        while (promotionContainer.hasChildNodes()) {
            promotionContainer.removeChild(promotionContainer.lastChild);
        }
        const numPromotions = this.unit.Experience?.getLevel;
        if (numPromotions && numPromotions > 0) {
            const promotionNumber = document.createElement("div");
            promotionNumber.classList.add("w-4", "h-4");
            promotionNumber.innerHTML = numPromotions.toString();
            promotionContainer.appendChild(promotionNumber);
            this.Root.classList.add("unit-flag--has-promotions");
        }
    }
    setMovementPoints(amount) {
        // only do this for the local player
        if (this.unit.owner == GameContext.localObserverID) {
            const unitContainer = this.Root.querySelector('.unit-flag__container');
            if (unitContainer) {
                if (amount) {
                    unitContainer.classList.remove("no_movement");
                }
                else {
                    unitContainer.classList.add("no_movement");
                }
            }
            else {
                console.error("unit-flags: setMovementPoints(): Missing unitContainer with '.unit-flag__container' for cid: " + ComponentID.toLogString(this.componentID));
            }
        }
    }
    /**
     * Change the visibility of the unit's flag.
     * @param {RevealState} state - The visibility state to change to.
     */
    setVisibility(state) {
        if (this.isHidden) {
            return;
        }
        switch (state) {
            case RevealedStates.HIDDEN:
                this.unitContainer?.classList.add("hidden");
                break;
            case RevealedStates.REVEALED:
                this.unitContainer?.classList.add("hidden");
                break;
            case RevealedStates.VISIBLE:
                this.unitContainer?.classList.remove("hidden");
                break;
            default:
                console.warn("Unknown visibility reveal type passed to unit flag. vis: ", state, "  cid: ", ComponentID.toLogString(this.componentID));
                break;
        }
    }
    makeWorldAnchor(componentID) {
        this.destroyWorldAnchor();
        const height = 40.0;
        const worldAnchor = WorldAnchors.RegisterUnitAnchor(componentID, height);
        if (worldAnchor !== null && worldAnchor >= 0) {
            this.Root.setAttribute('data-bind-style-transform2d', `{{UnitAnchors.offsetTransforms[${worldAnchor}].value}}`);
            this.Root.setAttribute('data-bind-style-opacity', `{{UnitAnchors.visibleValues[${worldAnchor}]}}`);
        }
        else {
            console.error(`Failed to create WorldAnchor for unit`, componentID);
        }
    }
    destroyWorldAnchor() {
        if (this._worldAnchor) {
            this.Root.removeAttribute('data-bind-style-transform2d');
            this.Root.removeAttribute('data-bind-style-opacity');
            WorldAnchors.UnregisterUnitAnchor(this._worldAnchor);
        }
        this._worldAnchor = null;
    }
    updateHealth() {
        this.realizeUnitHealth();
    }
    updateMovement() {
        // movement can come in while a unit is being destroyed, so safety check here
        if (this.unit) {
            if (this.unit.isOnMap && this.unit.Movement) {
                this.setMovementPoints(this.unit.Movement.movementMovesRemaining);
                this.checkUnitPosition(this.unit);
            }
        }
    }
    checkUnitPosition(unit) {
        const units = MapUnits.getUnits(unit.location.x, unit.location.y);
        const plotCity = MapCities.getCity(unit.location.x, unit.location.y)
        const numUnits = units.length
        if (numUnits > 0) {
            let offset = (-numUnits/2) + 1;

            for (let u = 0; u < numUnits; u++) {
                const unitFlag = UnitFlagManager.instance.getFlag(units[u]);
                if (!unitFlag) {
                    console.error("unit-flags: checkUnitPosition(): Unit flag's for unit " + ComponentID.toLogString(units[u]) + " is not found");
                    return;
                }
                unitFlag.updateTop(offset, !!plotCity);
                offset += 1;
            }
        }
    }
    updateTop(position, cityOnPlot) {
        if (this.unitContainer) {
            this.unitContainer.style.left = Layout.pixels(position * -32);
            this.unitContainer.style.top = Layout.pixels(cityOnPlot?8:0);
        }
    }
    updatePromotions() {
        this.realizePromotions();
    }
    get componentID() {
        return this._componentID;
    }
    get unit() {
        const unit = Units.get(this.componentID);
        if (!unit) {
            console.error("Failed attempt to get a unit for unit flag: ", ComponentID.toLogString(this.componentID));
        }
        return unit;
    }
}
Controls.define('unit-flag', {
    createInstance: GenericUnitFlag,
    description: 'Unit Flag',
    classNames: ['unit-flag', 'allowCameraMovement'],
    styles: ['fs://game/base-standard/ui/unit-flags/unit-flags.css']
});
UnitFlagFactory.registerStyle(new GenericFlagMaker());

//# sourceMappingURL=file:///base-standard/ui/unit-flags/unit-flags.js.map
