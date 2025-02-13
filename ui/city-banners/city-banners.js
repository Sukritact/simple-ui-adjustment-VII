/**
 * @file city-banners.ts
 * @copyright 2021-2025, Firaxis Games
 * @description City Banners' logic for the indiviudal banners
 */
import CityBannerManager from '/base-standard/ui/city-banners/city-banner-manager.js';
import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import { BannerType, CityStatusType, BANNER_INVALID_LOCATION } from '/base-standard/ui/city-banners/banner-support.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { CreateElementTable } from '/core/ui/utilities/utilities-dom.js';
import FxsActivatable from '/core/ui/components/fxs-activatable.js';
const BANNER_ANCHOR_OFFSET = { x: 0, y: 0, z: 42 };
export class CityBannerComponent extends FxsActivatable {
    constructor() {
        super(...arguments);
        this._worldAnchorHandle = null;
        this.inputSelector = ".city-banner__container, .city-banner__queue-container, .city-banner__portrait";
        this.componentID = ComponentID.getInvalidID();
        this.isHidden = false;
        this.location = { x: 0, y: 0 };
        this.city = null;
        this.updateBuildsQueued = false;
        this.updateNameQueued = false;
        this.onActivateEventListener = this.onActivate.bind(this);
        this.elements = CreateElementTable(this.Root, {
            capitalIndicator: '.city-banner__capital-star',
            cityStateColor: '.city-banner__city-state-type',
            container: '.city-banner__container',
            growthQueue: '.city-banner__population-container',
            growthQueueMeter: '.city-banner__population-ring',
            growthQueueTurns: '.city-banner__population-container > .city-banner__turn > .city-banner__turn-number',
            productionQueue: '.city-banner__queue-container.queue-production',
            productionQueueMeter: '.city-banner__production-ring',
            productionQueueIcon: '.city-banner__queue-img',
            productionQueueTurns: '.city-banner__queue-container.queue-production > .city-banner__turn > .city-banner__turn-number',
            portrait: '.city-banner__portrait',
            portraitIcon: '.city-banner__portrait-img',
            urbanReligionSymbol: '.city-banner__religion-symbol',
            ruralReligionSymbol: '.city-banner__religion-symbol.religion-symbol--right',
            urbanReligionSymbolBackground: '.city-banner__religion-symbol-bg',
            ruralReligionSymbolBackground: '.city-banner__religion-symbol-bg.religion-bg--right',
            statusContainer: '.city-banner__status',
            statusIcon: '.city-banner__status-icon',
            portraitImg: '.city-banner__portrait-img',
            cityNameContainer: '.city-banner__name-container',
            cityName: '.city-banner__name',
            popCount: '.city-banner__population-number',
            civPatternContainer: '.city-banner__pattern-container',
            civPattern: '.city-banner__pattern',
            unrestTurns: '.city-banner__unrest > .city-banner__time-container > .city-banner__time-text',
            razedTurns: '.city-banner__razing > .city-banner__time-container > .city-banner__time-text'
        });
        this.civSymbols = null;
        this.civPatternElements = null;
    }
    get bannerLocation() {
        return this.location;
    }
    queueBuildsUpdate() {
        if (this.updateBuildsQueued)
            return;
        this.updateBuildsQueued = true;
        requestAnimationFrame(this.doBuildsUpdate.bind(this));
    }
    doBuildsUpdate() {
        this.realizeBuilds();
        this.realizeHappiness();
        this.realizeReligion();
        this.setPopulation(this.city.population);
        this.updateBuildsQueued = false;
    }
    queueNameUpdate() {
        if (this.updateNameQueued)
            return;
        this.updateNameQueued = true;
        requestAnimationFrame(this.doNameUpdate.bind(this));
    }
    // TODO: I don't believe this should be rebuilding the entire banner?
    doNameUpdate() {
        this.buildBanner();
        // All other queues cleared since full banner is rebuilt.
        this.updateBuildsQueued = false;
        this.updateNameQueued = false;
    }
    getDebugString() {
        return `'${this.location.x},${this.location.y}' for ${ComponentID.toLogString(this.componentID)}`;
    }
    getKey() {
        return ComponentID.toBitfield(this.componentID);
    }
    getLocation() {
        return this.location;
    }
    /**
     * getDebugLocation parses the data-debug-plot-index attribute on the DOM element and returns a float2 if it is valid.
     * This is used for generating many city banners attached to one city, but in differing plots, for stress testing.
     */
    getDebugLocation() {
        const plotIndexAttr = this.Root.getAttribute('data-debug-plot-index');
        if (!plotIndexAttr) {
            return null;
        }
        const plotIndex = parseFloat(plotIndexAttr);
        if (isNaN(plotIndex)) {
            return null;
        }
        return GameplayMap.getLocationFromIndex(plotIndex);
    }
    onAttach() {
        super.onAttach();
        this.Root.classList.add("-top-9", "absolute", "flex", "flex-row", "justify-start", "items-center", "flex-nowrap", "bg-center", "whitespace-nowrap", "bg-no-repeat");
        engine.on('BeforeUnload', this.onUnload, this);
        this.Root.addEventListener('action-activate', this.onActivateEventListener);
        const attrComponentID = this.Root.getAttribute('city-id');
        const attrX = this.Root.getAttribute('x');
        const attrY = this.Root.getAttribute('y');
        this.componentID = ComponentID.fromString(attrComponentID);
        this.location = this.getDebugLocation() ?? { x: BANNER_INVALID_LOCATION, y: BANNER_INVALID_LOCATION };
        if (attrX !== null && attrY !== null) {
            const x = Number.parseInt(attrX);
            const y = Number.parseInt(attrY);
            if (!isNaN(x) && !isNaN(y)) {
                this.location.x = x;
                this.location.y = y;
            }
        }
        if (ComponentID.isInvalid(this.componentID)) {
            console.error("City banner could not attach to manager because componentID sent was invalid.");
            return;
        }
        const manager = CityBannerManager.instance;
        manager.addChildForTracking(this);
        this.city = Cities.get(this.componentID);
        // if the banner manager doesn't know where we go, try to find out ourselves
        if (this.location.x == BANNER_INVALID_LOCATION || this.location.y == BANNER_INVALID_LOCATION) {
            if (this.city) {
                this.location.x = this.city.location.x;
                this.location.y = this.city.location.y;
            }
            else {
                console.error(`city-banners: Got placeholder location for non-city ${ComponentID.toLogString(this.componentID)}`);
            }
        }
        this.makeWorldAnchor(this.location);
        // Show or hide based on the fog-of-war (FOW)
        this.setVisibility(this.getVisibility());
        this.buildBanner();
    }
    /** Debug only: (this part of the) DOM is reloading. */
    onUnload() {
        this.cleanup();
    }
    onDetach() {
        this.cleanup();
        super.onDetach();
    }
    cleanup() {
        const manager = CityBannerManager.instance;
        manager.removeChildFromTracking(this);
        engine.off('BeforeUnload', this.onUnload, this);
        this.Root.removeEventListener('action-activate', this.onActivateEventListener);
        this.destroyWorldAnchor();
        this.componentID = ComponentID.getInvalidID();
    }
    onActivate() {
        if (this.componentID.owner == GameContext.localPlayerID) {
            UI.Player.selectCity(this.componentID);
        }
        else {
            const otherPlayer = Players.get(this.componentID.owner);
            if (!otherPlayer) {
                console.error("city-banners: Invalid player library for owner of clicked city.");
                return;
            }
            if (otherPlayer.isMajor || otherPlayer.isMinor || otherPlayer.isIndependent) {
                //Enter diplomacy if clicking on the city of another major player
                //  Needing to add edge case check for if players haven't met since early age and distanct lands from each other so will never meet.
                //      but close enough they spot each other.
                if (!Game.Diplomacy.hasMet(GameContext.localPlayerID, this.componentID.owner)) {
                    return;
                }
                DiplomacyManager.raiseDiplomacyHub(this.componentID.owner);
            }
        }
    }
    setVisibility(state) {
        if (this.isHidden) {
            return;
        }
        switch (state) {
            case RevealedStates.HIDDEN:
                this.Root.classList.add("hidden");
                break;
            case RevealedStates.REVEALED:
                this.Root.classList.remove("hidden");
                break;
            case RevealedStates.VISIBLE:
                this.Root.classList.remove("hidden");
                break;
            default:
                console.warn("Unknown visibility reveal type passed to city banner. vis: ", state, "  cid: ", ComponentID.toLogString(this.componentID));
                break;
        }
    }
    getVisibility() {
        return GameplayMap.getRevealedState(GameContext.localObserverID, this.location.x, this.location.y);
    }
    makeWorldAnchor(location) {
        this._worldAnchorHandle = WorldAnchors.RegisterFixedWorldAnchor(location, BANNER_ANCHOR_OFFSET);
        if (this._worldAnchorHandle !== null && this._worldAnchorHandle >= 0) {
            this.Root.setAttribute('data-bind-style-transform2d', `{{FixedWorldAnchors.offsetTransforms[${this._worldAnchorHandle}].value}}`);
            this.Root.setAttribute('data-bind-style-opacity', `{{FixedWorldAnchors.visibleValues[${this._worldAnchorHandle}]}}`);
        }
        else {
            console.error(`Failed to create world anchor for location`, location);
        }
    }
    destroyWorldAnchor() {
        if (!this._worldAnchorHandle) {
            return;
        }
        this.Root.removeAttribute('data-bind-style-transform2d');
        this.Root.removeAttribute('data-bind-style-opacity');
        WorldAnchors.UnregisterFixedWorldAnchor(this._worldAnchorHandle);
        this._worldAnchorHandle = null;
    }
    /**
     * Realizes the entire banner.
     */
    buildBanner() {
        const city = this.city;
        const playerID = this.componentID.owner;
        const player = Players.get(playerID);
        if (!player) {
            console.error("Unable to (re)build banner due to not having a valid player: ", playerID);
            return;
        }
        let bannerType = BannerType.village;
        if (city) {
            bannerType = (player.isMinor ? BannerType.cityState : city.isTown ? BannerType.town : BannerType.city);
        }
        let bonusDefinition = undefined;
        let civSymbol = "";
        if (bannerType == BannerType.cityState || bannerType == BannerType.village) {
            let cityStateColor = "";
            let cityStateIcon = "";
            const bonusType = Game.CityStates.getBonusType(playerID);
            bonusDefinition = GameInfo.CityStateBonuses.find(t => t.$hash == bonusType);
            const player = Players.get(this.componentID.owner);
            if (player) {
                let yieldType = '';
                let indCivType = GameInfo.Civilizations.lookup(player.civilizationType)?.CivilizationType;
                let imagePath = '';
                GameInfo.Independents.forEach(indDef => {
                    if (player.civilizationAdjective == indDef.CityStateName) {
                        indCivType = indDef.CityStateType;
                    }
                });
                switch (indCivType) {
                    case "MILITARISTIC":
                        cityStateColor = "#AF1B1C";
                        cityStateIcon = "url('fs://game/bonustype_militaristic.png')";
                        break;
                    case "SCIENTIFIC":
                        yieldType = 'YIELD_SCIENCE';
                        cityStateColor = "#4D7C96";
                        cityStateIcon = "url('fs://game/bonustype_scientific.png')";
                        break;
                    case "ECONOMIC":
                        yieldType = 'YIELD_GOLD';
                        cityStateColor = "#FFD553";
                        cityStateIcon = "url('fs://game/bonustype_economic.png')";
                        break;
                    case "CULTURAL":
                        yieldType = 'YIELD_CULTURE';
                        cityStateColor = "#892BB3";
                        cityStateIcon = "url('fs://game/bonustype_cultural.png')";
                        break;
                }
                imagePath = yieldType != '' ? "url(" + UI.getIconURL(yieldType, indCivType == "MILITARISTIC" ? "PLAYER_RELATIONSHIP" : "YIELD") + ")" : "url('fs://game/Action_Attack.png')";
                civSymbol = imagePath;
            }
            if (!bonusDefinition && bonusType != -1) {
                console.error(`city-banners: couldn't find definition for city-state bonus type ${bonusType}`);
            }
            this.realizeCityStateType(cityStateColor, cityStateIcon);
        }
        else {
            civSymbol = Icon.getCivSymbolCSSFromPlayer(this.componentID);
        }
        const leaderType = player.leaderType;
        let tooltip = "";
        let icon = Icon.getLeaderPortraitIcon(leaderType);
        const leader = GameInfo.Leaders.lookup(leaderType);
        let leaderName = Locale.compose((leader == null) ? "LOC_LEADER_NONE_NAME" : leader.Name);
        const civName = Locale.compose(GameplayMap.getOwnerName(this.location.x, this.location.y));
        // if this is an IP village or a town or city captured by an IP, use the IP leader name
        if (bannerType == BannerType.village || ((bannerType == BannerType.town || bannerType == BannerType.city) && player.isIndependent)) {
            leaderName = Locale.compose(player.name);
        }
        // Display icon of suzerain if this is a minor civ and update tooltip to show suzerain and bonus given
        if (player.isMinor && player.Influence?.hasSuzerain) {
            const suzerain = player.Influence.getSuzerain();
            const suzerainPlayer = Players.get(suzerain);
            if (suzerainPlayer) {
                icon = Icon.getLeaderPortraitIcon(suzerainPlayer.leaderType);
                const suzerainLeaderName = Locale.compose(suzerainPlayer.name);
                tooltip = `<div>${suzerainLeaderName}</div><div>${civName}</div>`;
            }
            if (bonusDefinition?.Name) {
                const bonusDefinitionName = Locale.compose(bonusDefinition.Name);
                tooltip += `<div>${bonusDefinitionName}</div>`;
            }
            this.affinityUpdate();
        }
        else {
            tooltip = `<div>${leaderName}</div><div>${civName}</div>`;
        }
        let name = "";
        if (city) {
            name = city.name;
        }
        else {
            if (player == null) {
                name = Locale.compose("LOC_TERM_NONE");
                console.error(`city-banners: buildBanner(): couldn't get player for independent with PlayerId ${this.componentID.owner}`);
            }
            else {
                name = Locale.compose(player.civilizationFullName);
            }
        }
        const bannerData = {
            name: name,
            icon,
            tooltip,
            bannerType,
        };
        this.setCityInfo(bannerData);
        if (city) {
            this.setPopulation(city.population);
            this.realizeBuilds();
            this.realizeHappiness();
            this.realizeReligion();
        }
        if (bannerType == BannerType.village) {
            this.affinityUpdate();
        }
        this.realizePlayerColors();
        this.realizeCivHeraldry(civSymbol);
        this.updateConqueredIcon();
    }
    /**
     * Set the static information inside of the city banner.
     * @param {BannerData} data All string data is locale translated.
     */
    setCityInfo(data) {
        const name = data.name ?? "LOC_CITY_NAME_UNSET";
        const icon = data.icon ?? "fs://game/base-standard/ui/icons/leaders/leader_portrait_unknown.png";
        const { capitalIndicator, container, cityName, portrait, portraitIcon, } = this.elements;
        cityName.textContent = Locale.compose(name).toUpperCase();
        portraitIcon.style.backgroundImage = `url('${icon}')`;
        portrait.setAttribute("data-tooltip-content", data.tooltip);
        // remove all of the possible 4 variant classes
        this.Root.classList.remove('city-banner--town', 'city-banner--city', 'city-banner--city-other', 'city-banner--citystate');
        // and now add the appropriate variant class
        if (data.bannerType == BannerType.town) {
            container.setAttribute("data-tooltip-content", Locale.compose("LOC_CAPITAL_SELECT_PROMOTION_NONE"));
            this.Root.classList.add('city-banner--town');
        }
        else {
            container.setAttribute("data-tooltip-content", data.tooltip);
            if (data.bannerType == BannerType.cityState) {
                this.Root.classList.add("city-banner--citystate");
            }
            else if (data.bannerType == BannerType.village) {
                // village is based on town
                this.Root.classList.add("city-banner--village", "city-banner--town");
            }
            else {
                const isLocalPlayerCity = this.componentID.owner === GameContext.localObserverID;
                this.Root.classList.toggle('city-banner--city', isLocalPlayerCity);
                this.Root.classList.toggle('city-banner--city-other', !isLocalPlayerCity);
                if (this.city) {
                    capitalIndicator.classList.toggle('hidden', !this.city.isCapital);
                    // don't show the capital indicator for a city captured by an independent power
                    const player = Players.get(this.componentID.owner);
                    if (player && player.isIndependent) {
                        capitalIndicator.classList.add('hidden');
                    }
                }
            }
        }
    }
    setPopulation(population) {
        this.elements.popCount.textContent = population.toString();
    }
    setProduction(data) {
        const { productionQueue, productionQueueIcon, productionQueueTurns, productionQueueMeter } = this.elements;
        if (data.turnsLeft > 0) {
            productionQueue.classList.remove('queue-none');
            productionQueueIcon.style.backgroundImage = `url('${Icon.getProductionIconFromHash(data.hash)}')`;
            productionQueueIcon.classList.toggle('city-banner__queue-img--unit', (data.kind == ProductionKind.UNIT));
            const name = (data.kind == ProductionKind.UNIT) ? GameInfo.Units.lookup(data.hash)?.Name : GameInfo.Constructibles.lookup(data.hash)?.Name;
            if (!name) {
                console.error(`City Banner Production Icon Tooltip: No name could be found for data with hash ${data.hash}`);
            }
            else {
                productionQueue.setAttribute("data-tooltip-content", `<div>${Locale.compose("LOC_UI_CITY_BANNER_PRODUCTION")}</div><div>${Locale.compose(name)}</div>`);
            }
        }
        else {
            productionQueue.classList.add('queue-none');
        }
        productionQueueTurns.textContent = data.turnsLeft.toString();
        productionQueueMeter.setAttribute("value", data.percentLeft.toString());
    }
    setFood(data) {
        const { growthQueueMeter, growthQueueTurns } = this.elements;
        growthQueueMeter.setAttribute("value", data.current.toString());
        growthQueueMeter.setAttribute("max-value", data.nextTarget.toString());
        if (data.turnsLeft >= 0) {
            growthQueueTurns.innerHTML = data.turnsLeft.toString();
            growthQueueTurns.classList.remove('hidden');
        }
        else {
            growthQueueTurns.classList.add('hidden');
        }
    }
    setPopulation(population) {
        this.elements.popCount.textContent = population.toString();

        const container = document.createElement("div");

        const populationDivContainer = document.createElement("div");
        populationDivContainer.style.width = "100%";
        populationDivContainer.style.position = "absolute";
        populationDivContainer.style.top = "-50%";
        populationDivContainer.style.setProperty('display', 'flex');
        populationDivContainer.style.setProperty('justify-content', 'center');
        populationDivContainer.style.setProperty('align-items', 'center');
        container.appendChild(populationDivContainer)
        const populationDiv = document.createElement("div");
        populationDiv.style.backgroundImage = `url('hud_sub_circle_bk')`
        populationDiv.style.setProperty('background-size', 'contain');
        populationDiv.style.width = "3.5rem";
        populationDiv.style.height = "3.5rem"
        populationDiv.style.setProperty('display', 'flex');
        populationDiv.style.setProperty('justify-content', 'center');
        populationDiv.style.setProperty('align-items', 'center');
        populationDiv.classList.add('text-secondary', 'text-center', 'uppercase', 'font-title');
        populationDiv.style.setProperty('font-size', '1.5rem');
        populationDiv.innerHTML = population.toString();
        populationDivContainer.appendChild(populationDiv)

        const populationLabelDiv = document.createElement("div");
        populationLabelDiv.innerHTML = Locale.toUpper(Locale.compose("LOC_UI_CITY_INTERACT_CURENT_POPULATION_HEADER"))
        populationLabelDiv.classList.add('text-secondary', 'text-center', 'uppercase', 'font-title');
        populationLabelDiv.style.setProperty('font-size', '0.9rem');
        populationLabelDiv.style.setProperty('margin-top', '0.3rem');
        populationLabelDiv.style.setProperty('margin-bottom', '0.3rem');
        populationLabelDiv.style.setProperty('text-align', 'center');
        container.appendChild(populationLabelDiv)

        const growthData = document.createElement("div");
        let curFood = this.city.Growth.currentFood
        let reqFood = this.city.Growth.getNextGrowthFoodThreshold().value
        let netFood = this.city.Yields?.getNetYield(YieldTypes.YIELD_FOOD)
        curFood = Math.round(curFood)
        reqFood = Math.round(reqFood)
        netFood = Math.round(netFood)
        netFood = (netFood>=0)?'+'+netFood:'-'+netFood
        let growthDataText = Locale.stylize(Locale.compose(
            "LOC_SUK_SUA_GROWTH_TT",
            curFood,
            reqFood,
            netFood
        ))
        growthData.style.setProperty('font-size', '0.8rem');
        growthData.style.setProperty('text-align', 'center');
        growthData.innerHTML = growthDataText
        container.appendChild(growthData)

        const turnsUntilGrowthDiv = document.createElement("div");
        turnsUntilGrowthDiv.innerHTML = Locale.compose("LOC_UI_CITY_INTERACT_TURNS_TILL_GROWTH", this.city.Growth.turnsUntilGrowth)
        turnsUntilGrowthDiv.style.setProperty('text-align', 'center');
        turnsUntilGrowthDiv.style.setProperty('font-size', '0.8rem');
        container.appendChild(turnsUntilGrowthDiv)

        const populationBreakdownDiv = document.createElement("div");
        populationBreakdownDiv.style.setProperty('margin-top', '0.4rem');
        populationBreakdownDiv.innerHTML += Locale.compose("LOC_UI_CITY_STATUS_URBAN_POPULATION") + ": " + this.city.urbanPopulation;
        populationBreakdownDiv.innerHTML += "[N]" + Locale.compose("LOC_ATTR_YIELDS_FROM_RURAL_POPULATION") + ": " + this.city.ruralPopulation;
        populationBreakdownDiv.innerHTML = Locale.stylize(populationBreakdownDiv.innerHTML)
        container.appendChild(populationBreakdownDiv)

        this.elements.growthQueue.setAttribute("data-tooltip-content", container.innerHTML);
        container.remove()

    }
    realizeCityStateType(color, icon) {
        const iconDiv = MustGetElement(".city-banner__city-state-icon", this.Root);
        iconDiv.style.backgroundImage = icon;
        iconDiv.style.fxsBackgroundImageTint = color;
    }
    realizePlayerColors() {
        let playerColorPri = UI.Player.getPrimaryColorValueAsString(this.componentID.owner);
        let playerColorSec = UI.Player.getSecondaryColorValueAsString(this.componentID.owner);
        //Prevent unreadable color combos
        if (playerColorPri == playerColorSec) {
            playerColorPri = "rgb(155, 0, 0)";
        }
        this.Root.style.setProperty('--player-color-primary', playerColorPri);
        this.Root.style.setProperty('--player-color-secondary', playerColorSec);
        this.Root.style.display = "flex";
    }
    realizeCivHeraldry(icon) {
        this.civPatternElements ?? (this.civPatternElements = this.Root.getElementsByClassName('city-banner__pattern'));
        const civPattern = Icon.getCivLineCSSFromPlayer(this.componentID);
        for (let i = 0; i < this.civPatternElements.length; i++) {
            this.civPatternElements[i].style.backgroundImage = civPattern;
        }
        this.civSymbols ?? (this.civSymbols = this.Root.getElementsByClassName('city-banner__symbol'));
        for (let i = 0; i < this.civSymbols.length; i++) {
            this.civSymbols[i].style.backgroundImage = icon;
        }
    }
    realizeReligion() {
        if (this.city) {
            // disable the religion section of the banner for starters
            this.Root.classList.remove('city-banner--has-religion');
            // check for a majority religion in this city
            const religion = GameInfo.Religions.find(t => t.$hash == this.city?.Religion?.majorityReligion);
            if (religion) {
                // there's a majority religion, so use that icon
                const icon = UI.getIconCSS(religion.ReligionType, "RELIGION");
                this.elements.urbanReligionSymbol.style.backgroundImage = icon;
                this.elements.ruralReligionSymbol.style.backgroundImage = icon;
                this.elements.cityName.classList.add("city-banner__icons-below-name");
                this.Root.classList.add('city-banner--has-religion');
            }
            else {
                // no majority, check if urban or rural religions exist
                const urbanReligion = GameInfo.Religions.find(t => t.$hash == this.city?.Religion?.urbanReligion);
                if (urbanReligion) {
                    const icon = UI.getIconCSS(urbanReligion.ReligionType, "RELIGION");
                    this.elements.urbanReligionSymbol.style.backgroundImage = icon;
                    this.elements.cityName.classList.add("city-banner__icons-below-name");
                    this.Root.classList.add('city-banner--has-religion');
                }
                const ruralReligion = GameInfo.Religions.find(t => t.$hash == this.city?.Religion?.ruralReligion);
                if (ruralReligion) {
                    const icon = UI.getIconCSS(ruralReligion.ReligionType, "RELIGION");
                    this.elements.ruralReligionSymbol.style.backgroundImage = icon;
                    this.elements.ruralReligionSymbolBackground.style.filter = "fxs-color-tint(red)";
                    this.elements.cityName.classList.add("city-banner__icons-below-name");
                    this.Root.classList.add('city-banner--has-religion');
                }
            }
        }
        else {
            console.error("City Banner missing city object when religion changed. cid: ", ComponentID.toLogString(this.componentID));
        }
    }
    realizeBuilds() {
        if (this.city) {
            if (this.city?.BuildQueue != undefined) {
                this.setProduction({
                    hash: this.city?.BuildQueue.currentProductionTypeHash,
                    turnsLeft: this.city?.BuildQueue.currentTurnsLeft,
                    percentLeft: this.city?.BuildQueue.getPercentComplete(this.city.BuildQueue.currentProductionTypeHash),
                    kind: this.city?.BuildQueue.currentProductionKind
                });
            }
            else {
                console.error("City-banners: RealizeBuilds: city.BuildQueue was undefined");
            }
            if (this.city.FoodQueue != undefined && this.city.Growth != undefined) {
                this.setFood({
                    hash: this.city.FoodQueue.getQueue().length > 0 ? this.city.FoodQueue.getQueue()[0].orderType : OrderTypes.NO_ORDER,
                    turnsLeft: this.city.Growth.turnsUntilGrowth,
                    kind: this.city.FoodQueue.currentProductionKind,
                    current: this.city.Growth.currentFood,
                    nextTarget: this.city.Growth.getNextGrowthFoodThreshold().value
                });
            }
            else {
                if (this.city.Growth == undefined) {
                    console.error("City-banners: RealizeBuilds: city.Growth was undefined");
                }
                if (this.city.FoodQueue == undefined) {
                    console.error("City-banners: RealizeBuilds: city.FoodQueue was undefined");
                }
            }
        }
        else {
            console.error("City Banner missing city object when production changed. cid: ", ComponentID.toLogString(this.componentID));
        }
    }
    realizeHappiness() {
        if (this.city) {
            const happiness = this.city.Yields?.getYield(YieldTypes.YIELD_HAPPINESS);
            if (happiness == undefined) {
                console.error("city-banners.ts: realizeHappiness() failed to find happiness yield for city cid: ", ComponentID.toLogString(this.componentID));
                return;
            }
            let happinessStatus = CityStatusType.happy;
            if (happiness < 0) {
                happinessStatus = CityStatusType.unhappy;
            }
            else if (happiness < -10) {
                happinessStatus = CityStatusType.angry;
            }
            if (this.city.isInfected) {
                happinessStatus = CityStatusType.plague;
            }
            const icon = UI.getIconURL(happinessStatus, "YIELD");
            this.elements.statusIcon.style.backgroundImage = `url('${icon}')`;
            const isLocalPlayerCity = this.componentID.owner === GameContext.localObserverID;
            this.elements.cityName.classList.toggle("city-banner__status--hidden", !isLocalPlayerCity);
            if (!this.city.Happiness) {
                console.error(`city-banners: City happiness is not valid, cid: ${ComponentID.toLogString(this.componentID)}`);
            }
            this.Root.classList.toggle("city-banner--unrest", this.city.Happiness?.hasUnrest);
            // Unrest turns are the number of turns a city has been in unrest, not the amount remaining so we need to calc it. Copied from town-unrest-display.ts
            const unrestTurns = this.city.Happiness?.turnsOfUnrest;
            if (unrestTurns != undefined && unrestTurns >= 0) {
                const remainingUnrest = Math.max(0, (GameInfo.UnhappinessEffects.lookup('StandardCityTransferUnrest')?.Amount ?? 10) - unrestTurns);
                this.elements.unrestTurns.innerHTML = remainingUnrest.toString();
            }
            this.Root.classList.toggle('city-banner--razing', this.city.isBeingRazed);
            const razedTurns = this.city.getTurnsUntilRazed.toString();
            this.elements.razedTurns.innerHTML = razedTurns;
        }
        else {
            console.error("city-banners.ts: realizeHappiness() failed to have a valid city cid: ", ComponentID.toLogString(this.componentID));
        }
    }
    affinityUpdate() {
        const localPlayerID = GameContext.localPlayerID;
        const player = Players.get(this.componentID.owner);
        if (player) {
            const relationship = Game.IndependentPowers.getIndependentRelationship(this.componentID.owner, localPlayerID);
            if (relationship == IndependentRelationship.NOT_APPLICABLE) {
                console.warn("Village Banner unable to determine affinity relationship.");
                return;
            }
            const classList = this.Root.classList;
            classList.toggle("city-banner--friendly", (relationship == IndependentRelationship.FRIENDLY));
            classList.toggle("city-banner--hostile", (relationship == IndependentRelationship.HOSTILE));
            classList.toggle("city-banner--neutral", (relationship == IndependentRelationship.NEUTRAL));
        }
    }
    capitalUpdate() {
        const capitalIndicator = MustGetElement('.city-banner__capital-star', this.Root);
        if (this.city) {
            capitalIndicator.classList.toggle('hidden', !this.city.isCapital);
            // don't show the capital indicator for a city captured by an independent power
            const player = Players.get(this.componentID.owner);
            if (player && player.isIndependent) {
                capitalIndicator.classList.add('hidden');
            }
        }
    }
    updateConqueredIcon() {
        if (this.city && (this.city.originalOwner != this.city.owner && this.city.owner == GameContext.localObserverID)) {
            const conqueredIcon = this.Root.querySelector(".city-banner__conquered-icon");
            if (!conqueredIcon) {
                console.error("city-banners: Unable to find element with class .city-banner__conquered-icon!");
                return;
            }
            conqueredIcon.setAttribute("data-tooltip-content", Locale.compose("LOC_CITY_BANNER_CONQUERED_TOOLTIP"));
            this.Root.classList.add("city-banner--conquered");
        }
        else {
            this.Root.classList.remove("city-banner--conquered");
        }
    }
    hide() {
        if (this.isHidden) {
            return;
        }
        this.isHidden = true;
        this.Root.classList.add("hidden");
    }
    show() {
        if (!this.isHidden) {
            return;
        }
        this.isHidden = false;
        this.setVisibility(this.getVisibility());
    }
    disable() {
        this.Root.classList.add("disabled");
        const elements = this.Root.querySelectorAll(this.inputSelector);
        if (elements.length == 0) {
            console.warn(`city-banners: disable(): Unable to disable city banner pieces. cid: ${ComponentID.toLogString(this.componentID)}`);
            return;
        }
        for (let i = 0; i < elements.length; i++) {
            elements[i].classList.add("disabled");
        }
    }
    enable() {
        this.Root.classList.remove("disabled");
        const elements = this.Root.querySelectorAll(this.inputSelector);
        if (elements.length == 0) {
            console.warn(`city-banners: disable(): Unable to disable city banner pieces. cid: ${ComponentID.toLogString(this.componentID)}`);
            return;
        }
        for (let i = 0; i < elements.length; i++) {
            elements[i].classList.remove("disabled");
        }
    }
    remove() {
        this.Destroy();
    }
}
Controls.define('city-banner', {
    createInstance: CityBannerComponent,
    description: 'City Banner',
    classNames: ['city-banner', 'allowCameraMovement'],
    styles: ['fs://game/base-standard/ui/city-banners/city-banners.css'],
    content: ['fs://game/base-standard/ui/city-banners/city-banners.html']
});

//# sourceMappingURL=file:///base-standard/ui/city-banners/city-banners.js.map
