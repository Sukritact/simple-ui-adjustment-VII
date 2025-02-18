/**
 * @file panel-sub-system-dock.ts
 * @copyright 2020-2024, Firaxis Games
 * @description A dock of sub-system launchers.
 */
//import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import ContextManager from '/core/ui/context-manager/context-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import Panel from '/core/ui/panel-support.js';
import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
/**
 * Area for sub system button icons.
 */
export class PanelSubSystemDock extends Panel {
    constructor() {
        super(...arguments);
        this.buttonContainer = document.createElement("fxs-hslot");
        this.ageRing = null;
        this.ageTurnCounter = null;
        this.cultureButton = null;
        this.cultureRing = null;
        this.cultureTurnCounter = null;
        this.techButton = null;
        this.techRing = null;
        this.techTurnCounter = null;
        this.policiesButton = null;
        this.resourcesButton = null;
        this.focusSubsystemListener = this.onFocusSubsystem.bind(this);
    }
    onInitialize() {
        super.onInitialize();
        const fragment = document.createDocumentFragment();
        this.buttonContainer.setAttribute("focus-rule", "last");
        this.buttonContainer.setAttribute("ignore-prior-focus", "");
        this.buttonContainer.classList.add("flow-row", "sub-system-dock--button-container");
        fragment.appendChild(this.buttonContainer);
        this.animateInType = this.animateOutType = 16 /* AnchorType.Fade */;
        const ageElements = this.addRingButton({
            tooltip: "LOC_UI_VICTORY_PROGRESS",
            callback: this.openRankings,
            class: ["ring-age", "tut-age"],
            ringClass: "ssb__texture-ring",
            modifierClass: 'agetimer',
            audio: "age-progress",
            focusedAudio: "data-audio-focus-large"
        });
        this.ageRing = ageElements.ring;
        this.ageTurnCounter = ageElements.turnCounter;
        const techElements = this.addRingButton({
            tooltip: "LOC_UI_VIEW_TECH_TREE",
            callback: this.openTechChooser,
            class: ["ring-tech", "tut-tech"],
            ringClass: "ssb__texture-ring",
            modifierClass: 'tech',
            audio: "tech-tree",
            focusedAudio: "data-audio-focus-large"
        });
        this.techButton = techElements.button;
        this.techRing = techElements.ring;
        this.techTurnCounter = techElements.turnCounter;
        const cultureElements = this.addRingButton({
            tooltip: "LOC_UI_VIEW_CIVIC_TREE",
            callback: this.openCultureChooser,
            class: ['ring-culture', "tut-culture"],
            ringClass: "ssb__texture-ring",
            modifierClass: 'civic',
            audio: "culture-tree",
            focusedAudio: "data-audio-focus-large"
        });
        this.cultureButton = cultureElements.button;
        this.cultureRing = cultureElements.ring;
        this.cultureTurnCounter = cultureElements.turnCounter;
        this.policiesButton = this.addButton({ tooltip: "LOC_UI_VIEW_TRADITIONS", modifierClass: 'gov', callback: this.onOpenPolicies.bind(this), class: "tut-traditions", audio: "government", focusedAudio: "data-audio-focus-small" });
        this.resourcesButton = this.addButton({ tooltip: "LOC_UI_VIEW_RESOURCE_ALLOCATION", modifierClass: 'resources', callback: this.onOpenResourceAllocation.bind(this), class: "tut-trade", audio: "resources", focusedAudio: "data-audio-focus-small" });
        this.addButton({ tooltip: "LOC_UI_VIEW_GREAT_WORKS", modifierClass: 'greatworks', callback: this.onOpenGreatWorks.bind(this), class: "tut-great-works", audio: "great-works", focusedAudio: "data-audio-focus-small" });
        if (Game.age != Database.makeHash("AGE_MODERN")) {
            this.addButton({ tooltip: "LOC_UI_VIEW_RELIGION", modifierClass: 'religion', callback: this.openReligionViewer.bind(this), class: "tut-religion", audio: "religion", focusedAudio: "data-audio-focus-small" });
        }
        this.addButton({ tooltip: "LOC_UI_VIEW_UNLOCKS", modifierClass: 'unlocks', callback: this.onOpenUnlocks.bind(this), class: "tut-unlocks", audio: "unlocks", focusedAudio: "data-audio-focus-small" });
        this.attachAdditionalInfo(this.resourcesButton, null);
        this.updateButtonTimers();
        this.Root.appendChild(fragment);
    }
    onAttach() {
        super.onAttach();
        engine.on('PlayerTurnActivated', this.onPlayerTurnBegin, this);
        engine.on('PlayerTurnDeactivated', this.onPlayerTurnEnd, this);
        engine.on('ScienceYieldChanged', this.onTechsUpdated, this);
        engine.on('TechTreeChanged', this.onTechsUpdated, this);
        engine.on('TechNodeCompleted', this.onTechsUpdated, this);
        engine.on('PlayerYieldChanged', this.onPlayerYieldUpdated, this);
        engine.on('PlayerYieldGranted', this.onPlayerYieldGranted, this);
        engine.on('CultureYieldChanged', this.onCultureUpdated, this);
        engine.on('CultureTreeChanged', this.onCultureUpdated, this);
        engine.on('CultureNodeCompleted', this.onCultureUpdated, this);
        engine.on('AgeProgressionChanged', this.updateAgeProgression, this);
        engine.on('ResourceAssigned', this.updateResourcesButton, this);
        engine.on('PlotOwnershipChanged', this.updateResourcesButton, this);
        window.addEventListener('focus-sub-system', this.focusSubsystemListener);
    }
    onDetach() {
        engine.off('PlayerTurnActivated', this.onPlayerTurnBegin, this);
        engine.off('PlayerTurnDeactivated', this.onPlayerTurnEnd, this);
        engine.off('PlayerYieldChanged', this.onPlayerYieldUpdated, this);
        engine.off('PlayerYieldGranted', this.onPlayerYieldGranted, this);
        engine.off('ScienceYieldChanged', this.onTechsUpdated, this);
        engine.off('TechTreeChanged', this.onTechsUpdated, this);
        engine.off('TechNodeCompleted', this.onTechsUpdated, this);
        engine.off('CultureYieldChanged', this.onCultureUpdated, this);
        engine.off('CultureTreeChanged', this.onCultureUpdated, this);
        engine.off('CultureNodeCompleted', this.onCultureUpdated, this);
        engine.off('ResourceAssigned', this.updateResourcesButton, this);
        engine.off('PlotOwnershipChanged', this.updateResourcesButton, this);
        engine.off('AgeProgressionChanged', this.updateAgeProgression, this);
        window.removeEventListener('focus-sub-system', this.focusSubsystemListener);
        super.onDetach();
    }
    addRingButton(buttonData) {
        const turnCounter = document.createElement("div");
        turnCounter.classList.add("ssb-button__turn-counter");
        turnCounter.setAttribute("data-tut-highlight", "founderHighlight");
        const turnCounterContent = document.createElement("div");
        turnCounterContent.classList.add("ssb-button__turn-counter-content", "font-title-base");
        turnCounter.appendChild(turnCounterContent);
        const ringAndButton = {
            button: this.createButton(buttonData),
            ring: this.createRing(buttonData),
            turnCounter
        };
        ringAndButton.button.setAttribute("data-audio-group-ref", "audio-panel-sub-system-dock");
        ringAndButton.button.setAttribute("data-audio-press-ref", "data-audio-press-large");
        ringAndButton.button.setAttribute("data-audio-activate-ref", "none");
        this.buttonContainer.appendChild(ringAndButton.ring);
        ringAndButton.ring.appendChild(ringAndButton.button);
        ringAndButton.ring.appendChild(ringAndButton.turnCounter);
        if (buttonData.ringClass) {
            ringAndButton.ring.setAttribute("ring-class", buttonData.ringClass);
        }
        const highlightObj = document.createElement("div");
        highlightObj.classList.add("ssb-button__highlight", "absolute");
        highlightObj.setAttribute("data-tut-highlight", "founderHighlight");
        ringAndButton.button.appendChild(highlightObj);
        ringAndButton.ring.classList.add("ssb__element");
        return ringAndButton;
    }
    addButton(buttonData) {
        const button = this.createButton(buttonData);
        button.classList.add("ssb__element");
        this.buttonContainer.appendChild(button);
        return button;
    }
    createRing(buttonData) {
        const ring = document.createElement("fxs-ring-meter");
        if (buttonData.class) {
            Array.isArray(buttonData.class) ? ring.classList.add(...buttonData.class) : ring.classList.add(buttonData.class);
        }
        ring.classList.add(buttonData.modifierClass);
        return ring;
    }
    createButton(buttonData) {
        const button = document.createElement("fxs-activatable");
        {
            button.classList.add("ssb__button", buttonData.modifierClass);
            button.setAttribute("data-tut-highlight", "founderHighlight");
            Array.isArray(buttonData.class) ? button.classList.add(...buttonData.class) : button.classList.add(buttonData.class);
            button.setAttribute("data-tooltip-content", Locale.compose(buttonData.tooltip));
            button.setAttribute("data-audio-group-ref", "audio-panel-sub-system-dock");
            button.setAttribute("data-audio-focus-ref", buttonData.focusedAudio ?? 'data-audio-focus');
            button.setAttribute("data-audio-activate-ref", "none");
            if (buttonData.audio) {
                button.setAttribute("data-audio-press-ref", "data-audio-press-small");
            }
            button.addEventListener('action-activate', (_event) => {
                buttonData.callback();
                FocusManager.clearFocus(button);
            });
            const buttonIconBg = document.createElement("div");
            {
                buttonIconBg.classList.add("ssb__button-iconbg", buttonData.modifierClass);
            }
            button.appendChild(buttonIconBg);
            const buttonIconBgHover = buttonIconBg.cloneNode();
            {
                buttonIconBgHover.classList.add("ssb__button-iconbg--hover");
            }
            button.appendChild(buttonIconBgHover);
            const buttonIconBgActive = buttonIconBg.cloneNode();
            {
                buttonIconBgActive.classList.add("ssb__button-iconbg--active");
            }
            button.appendChild(buttonIconBgActive);
            const buttonIconBgDisabled = buttonIconBg.cloneNode();
            {
                buttonIconBgDisabled.classList.add("ssb__button-iconbg--disabled");
            }
            button.appendChild(buttonIconBgDisabled);
            const buttonIcon = document.createElement("div");
            {
                buttonIcon.classList.add("ssb__button-icon", buttonData.modifierClass);
            }
            button.appendChild(buttonIcon);
        }
        return button;
    }
    attachAdditionalInfo(button, iconClass) {
        const progressMeter = document.createElement("div");
        progressMeter.classList.add("progress-meter");
        button.appendChild(progressMeter);
        const infoContainer = document.createElement('div');
        infoContainer.classList.add('ssb__info-container');
        const nameText = document.createElement('div');
        nameText.classList.add('ssb__info-name');
        infoContainer.appendChild(nameText);
        const textContainer = document.createElement("div");
        textContainer.classList.add("ssb__turn");
        if (iconClass) {
            const timerIcon = document.createElement("div");
            timerIcon.classList.add(iconClass);
            textContainer.appendChild(timerIcon);
        }
        const text = document.createElement("div");
        text.classList.add("ssb__turn-number");
        textContainer.appendChild(text);
        infoContainer.appendChild(textContainer);
        button.appendChild(infoContainer);
    }
    updateTurnCounter(element, turns) {
        if (!element) {
            console.error("panel-sub-system-dock: Unable to find turn counter element, skipping update of turn counter");
            return;
        }
        const content = element.querySelector(".ssb-button__turn-counter-content");
        if (content) {
            content.textContent = turns.toString();
        }
        element.classList.toggle('ssb-button__turn-counter--hidden', turns == 0 || turns == "");
    }
    updateButtonIcon(element, icon) {
        const iconElement = element.querySelector(".ssb__button-icon");
        if (iconElement) {
            if (icon === "") {
                iconElement.style.removeProperty("background-image");
            }
            else {
                iconElement.style.backgroundImage = `url('${icon}')`;
            }
        }
    }
    updateButtonTimers() {
        this.updateAgeButtonTimer();
        this.updateCultureButtonTimer();
        this.updateTechButtonTimer();
        this.updateResourcesButton();
        this.updatePoliciesTooltip();
    }
    updateCultureButtonTimer() {
        if (!this.cultureButton) {
            console.error("panel-sub-system-dock: Unable to find culture button, skipping update of turn timer");
            return;
        }
        const localPlayerID = GameContext.localPlayerID;
        const localPlayer = Players.getEverAlive()[GameContext.localPlayerID];
        if (localPlayer == null) {
            return; // autoplaying
        }
        let cultureTimer = 0;
        let cultureTooltipString = "";
        let cultureIcon = "";
        let cultureProgressRatio = 100;
        let cultureNameString = "";
        const culture = localPlayer.Culture;
        if (culture) {
            const activeCultureTreeType = culture.getActiveTree();
            const treeObject = Game.ProgressionTrees.getTree(localPlayerID, activeCultureTreeType);
            if (treeObject && treeObject.activeNodeIndex >= 0) {
                const activeNode = treeObject.nodes[treeObject.activeNodeIndex];
                const nodeData = Game.ProgressionTrees.getNode(localPlayerID, activeNode.nodeType);
                if (nodeData) {
                    const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(nodeData.nodeType);
                    if (nodeInfo) {
                        cultureNameString = Locale.compose(nodeInfo.Name ?? nodeInfo.ProgressionTreeNodeType);
                        if (nodeData.depthUnlocked >= 1) {
                            let depthNumeral = Locale.toRomanNumeral(nodeData.depthUnlocked + 1);
                            if (depthNumeral) {
                                cultureNameString += " " + depthNumeral;
                            }
                        }
                        const cost = culture.getNodeCost(culture.getResearching().type);
                        cultureIcon = Icon.getCultureIconFromProgressionTreeNodeDefinition(nodeInfo);
                        cultureTimer = culture.getTurnsLeft();
                        cultureTooltipString = Locale.compose("LOC_SUB_SYSTEM_CULTURE_CURRENT_RESEARCH", cultureNameString, cultureTimer);
                        cultureProgressRatio = 1 - (nodeData.progress / cost);
                    }
                }
            }
        }
        else {
            console.error("panel-sub-system-dock: unable to find local player culture, skipping update of culture button timer.");
        }
        this.updateTurnCounter(this.cultureTurnCounter, cultureTimer.toString());
        this.updateButtonIcon(this.cultureButton, cultureIcon);
        if (cultureTooltipString != "") {
            this.cultureButton.setAttribute("data-tooltip-content", cultureTooltipString);
        }
        else {
            this.cultureButton.setAttribute("data-tooltip-content", "LOC_SUB_SYSTEM_CULTURE_NO_RESEARCH");
        }
        this.cultureRing?.setAttribute('value', (100 - cultureProgressRatio * 100).toString());
    }
    updateAgeButtonTimer() {
        if (!this.ageRing) {
            console.error("panel-sub-system-dock: Unable to find age ring, skipping update of turn timers");
            return;
        }
        const ageName = GameInfo.Ages.lookup(Game.age)?.Name ?? "";
        const ageProgress = Game.AgeProgressManager.getCurrentAgeProgressionPoints();
        const maxAgeProgress = Game.AgeProgressManager.getMaxAgeProgressionPoints();
        if (Game.maxTurns > 0) {
            const ageProgressFrac = Locale.compose("LOC_ACTION_PANEL_CURRENT_TURN_OVER_MAX_TURNS", Game.turn, Game.maxTurns);
            this.ageRing.setAttribute('data-tooltip-content', ageProgressFrac);
        }
        else {
            const ageProgressFrac = Locale.compose("LOC_ACTION_PANEL_CURRENT_AGE_PROGRESS", ageName, ageProgress, maxAgeProgress);
            this.ageRing.setAttribute('data-tooltip-content', ageProgressFrac);
        }
        this.updateVictoryMeter(ageProgress);
    }
    updateVictoryMeter(victoryProgression) {
        const maxAgeProgress = Game.AgeProgressManager.getMaxAgeProgressionPoints();
        this.ageRing?.setAttribute('min-value', '0');
        this.ageRing?.setAttribute('max-value', maxAgeProgress.toString());
        this.ageRing?.setAttribute('value', victoryProgression.toString());
        const ageProgressPercent = Locale.toPercent(victoryProgression / maxAgeProgress);
        this.updateTurnCounter(this.ageTurnCounter, ageProgressPercent);
    }
    updateAgeProgression(data) {
        this.updateVictoryMeter(data.progressionTotal);
        if (Players.isValid(GameContext.localPlayerID)) {
            if (data.ageIsEnding != undefined && data.ageIsEnding) {
                const popupBody = Locale.stylize("LOC_UI_GAME_ENDING_SOON_SUMMARY");
                DialogManager.createDialog_Confirm({
                    body: popupBody,
                    title: "LOC_UI_GAME_ENDING_SOON_TITLE",
                });
            }
        }
    }
    updateTechButtonTimer() {
        if (!this.techButton) {
            console.error("panel-sub-system-dock: Unable to find tech button, skipping update of turn timers");
            return;
        }
        const localPlayerID = GameContext.localPlayerID;
        const localPlayer = Players.getEverAlive()[GameContext.localPlayerID];
        if (localPlayer == null) {
            return; // autoplaying
        }
        let techTimer = 0;
        let techTooltipString = "";
        let techIcon = "";
        let techProgressRatio = 100;
        let techNameString = "";
        const techs = localPlayer.Techs;
        if (techs) {
            const techTreeType = techs.getTreeType();
            const treeObject = Game.ProgressionTrees.getTree(localPlayerID, techTreeType);
            if (treeObject && treeObject.activeNodeIndex >= 0) {
                const activeNode = treeObject.nodes[treeObject.activeNodeIndex];
                const nodeData = Game.ProgressionTrees.getNode(localPlayerID, activeNode.nodeType);
                if (nodeData) {
                    const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(activeNode.nodeType);
                    if (nodeInfo) {
                        techNameString = Locale.compose(nodeInfo.Name ?? nodeInfo.ProgressionTreeNodeType);
                        if (nodeData.depthUnlocked >= 1) {
                            let depthNumeral = Locale.toRomanNumeral(nodeData.depthUnlocked + 1);
                            if (depthNumeral) {
                                techNameString += " " + depthNumeral;
                            }
                        }
                        const cost = techs.getNodeCost(techs.getResearching().type);
                        techIcon = Icon.getTechIconFromProgressionTreeNodeDefinition(nodeInfo);
                        techTimer = techs.getTurnsLeft();
                        techTooltipString = Locale.compose("LOC_SUB_SYSTEM_TECH_CURRENT_RESEARCH", techNameString, techTimer);
                        techProgressRatio = 1 - (nodeData.progress / cost);
                    }
                }
            }
        }
        this.updateTurnCounter(this.techTurnCounter, techTimer.toString());
        this.updateButtonIcon(this.techButton, techIcon);
        if (techTooltipString != "") {
            this.techButton.setAttribute("data-tooltip-content", techTooltipString);
        }
        else {
            this.techButton.setAttribute("data-tooltip-content", "LOC_SUB_SYSTEM_TECH_NO_RESEARCH");
        }
        this.techRing?.setAttribute('value', (100 - techProgressRatio * 100).toString());
    }
    updatePoliciesTooltip() {
        const localPlayer = Players.get(GameContext.localPlayerID);
        if (!localPlayer) {
            console.error("panel-sub-system-dock: createTraditionsTooltip() - No local player!");
            return;
        }
        const localPlayerHappiness = localPlayer.Happiness;
        if (localPlayerHappiness == undefined) {
            console.error("panel-sub-system-dock: createTraditionsTooltip() - No local player happiness!");
            return;
        }
        const localPlayerStats = localPlayer?.Stats;
        if (localPlayerStats === undefined) {
            console.error("panel-sub-system-dock: createTraditionsTooltip() - Local player stats is undefined!");
            return;
        }
        if (localPlayerHappiness.isInGoldenAge()) {
            const goldenAgeTurnsLeft = localPlayerHappiness.getGoldenAgeTurnsLeft();
            this.policiesButton?.setAttribute("data-tooltip-content", Locale.compose("LOC_SUB_SYSTEM_TRADITIONS_TURNS_UNTIL_CELEBRATION_END", goldenAgeTurnsLeft));
        }
        else {
            const happinessPerTurn = localPlayerStats.getNetYield(YieldTypes.YIELD_HAPPINESS) ?? -1;
            const nextGoldenAgeThreshold = localPlayerHappiness.nextGoldenAgeThreshold;
            const happinessTotal = Math.ceil(localPlayerStats.getLifetimeYield(YieldTypes.YIELD_HAPPINESS)) ?? -1;
            const turnsToNextGoldenAge = Math.ceil((nextGoldenAgeThreshold - happinessTotal) / happinessPerTurn);
            this.policiesButton?.setAttribute("data-tooltip-content", Locale.compose("LOC_SUB_SYSTEM_TRADITIONS_TURNS_UNTIL_CELEBRATION_START", turnsToNextGoldenAge));
        }
    }
    updateResourcesButton() {
        if (!this.resourcesButton) {
            console.error("panel-sub-system-dock: Unable to find resources button, skipping update of turn timers");
            return;
        }
        const localPlayer = Players.getEverAlive()[GameContext.localPlayerID];
        if (localPlayer == null) {
            return; // autoplaying
        }
        const playerResources = localPlayer.Resources;
        if (!playerResources) {
            console.error(`panel-sub-system-dock: updateResourcesButton - Failed to retrieve Resources for Player ${GameContext.localPlayerID}`);
            return;
        }
        let availableCount = 0;
        availableCount = playerResources.getCountResourcesToAssign();
        const resourcesTimerElement = this.resourcesButton.querySelector(".ssb__turn-number");
        if (resourcesTimerElement) {
            resourcesTimerElement.style.display = availableCount > 0 ? 'flex' : 'none';
            resourcesTimerElement.innerHTML = availableCount.toString();
        }
        else {
            console.error("panel-sub-system-dock: updateResourcesButton(): Missing resourcesTimerElement with '.ssb__turn-number'");
        }
    }
    onPlayerYieldUpdated(data) {
        if (data.player && data.player != GameContext.localPlayerID) {
            //Not us, we don't need to update
            return;
        }
        if (data.yield == YieldTypes.YIELD_CULTURE) {
            this.updateCultureButtonTimer();
        }
        else if (data.yield == YieldTypes.YIELD_SCIENCE) {
            this.updateTechButtonTimer();
        }
    }
    onPlayerYieldGranted(data) {
        if (data.player && data.player != GameContext.localPlayerID) {
            //Not us, we don't need to update
            return;
        }
        if (data.yield == YieldTypes.YIELD_CULTURE) {
            this.updateCultureButtonTimer();
        }
        else if (data.yield == YieldTypes.YIELD_SCIENCE) {
            this.updateTechButtonTimer();
        }
    }
    onTechsUpdated(data) {
        if (data.player && data.player != GameContext.localPlayerID) {
            //Not us, we don't need to update
            return;
        }
        this.updateTechButtonTimer();
    }
    onCultureUpdated(data) {
        if (data.player && data.player != GameContext.localPlayerID) {
            //Not us, we don't need to update
            return;
        }
        this.updateCultureButtonTimer();
    }
    onPlayerTurnEnd(data) {
        if (data.player && data.player != GameContext.localPlayerID) {
            //Not us, we don't need to update
            return;
        }
    }
    onPlayerTurnBegin(data) {
        if (data.player && data.player != GameContext.localPlayerID) {
            //Not us, we don't need to update
            return;
        }
        this.updateButtonTimers();
    }
    onFocusSubsystem() {
        if (this.techButton) {
            const focus = this.Root.querySelector(':focus');
            if (focus) {
                FocusManager.clearFocus(focus);
            }
            else {
                FocusManager.setFocus(this.techButton);
            }
        }
    }
    openCultureChooser() {
        ContextManager.push("screen-culture-tree-chooser", { singleton: true });
    }
    openTechChooser() {
        ContextManager.push("screen-tech-tree-chooser", { singleton: true });
    }
    onOpenPolicies() {
        ContextManager.push("screen-policies", { singleton: true, createMouseGuard: true });
    }
    openRankings() {
        ContextManager.push("screen-victory-progress", { singleton: true, createMouseGuard: true });
    }
    onOpenGreatWorks() {
        ContextManager.push("screen-great-works", { singleton: true, createMouseGuard: true });
    }
    onOpenResourceAllocation() {
        ContextManager.push("screen-resource-allocation", { singleton: true, createMouseGuard: true });
    }
    onOpenUnlocks() {
        ContextManager.push("screen-unlocks", { singleton: true, createMouseGuard: true });
    }
    openReligionViewer() {
        const curAge = Game.age;
        if (curAge == Database.makeHash("AGE_ANTIQUITY")) {
            const player = Players.get(GameContext.localPlayerID);
            if (!player) {
                console.error("panel-sub-system-dock: openReligionViewer() - no local player found!");
                return;
            }
            const playerCulture = player.Culture;
            if (!playerCulture) {
                console.error("panel-sub-system-dock: openReligionViewer() - no player culture found!");
                return;
            }
            const playerReligion = player.Religion;
            if (!playerReligion) {
                console.error("panel-sub-system-dock: openReligionViewer() - no player religion found!");
                return;
            }
            const numPantheonsToAdd = playerReligion.getNumPantheonsUnlocked();
            const mustAddPantheons = playerCulture.isNodeUnlocked("NODE_CIVIC_AQ_MAIN_MYSTICISM") && numPantheonsToAdd > 0;
            if (mustAddPantheons) {
                ContextManager.push("screen-pantheon-chooser", { singleton: true });
            }
            else {
                ContextManager.push("panel-pantheon-complete", { singleton: true });
            }
        }
        else if (curAge == Database.makeHash("AGE_EXPLORATION")) {
            const player = Players.get(GameContext.localPlayerID);
            if (!player) {
                console.error("panel-sub-system-dock: openReligionViewer() - No player object found!");
                return;
            }
            if (!player.Religion) {
                console.error("panel-sub-system-dock: openReligionViewer() - No player religion object found!");
                return;
            }
            if (player.Religion.canCreateReligion() && !player.Religion.hasCreatedReligion()) {
                ContextManager.push("panel-religion-picker", { singleton: true });
            }
            else {
                ContextManager.push("panel-belief-picker", { singleton: true });
            }
        }
        else {
            console.error("panel-sub-system-dock: openReligionViewer() - religion button pressed during an age that is neither Exploration nor Antiquity!");
        }
    }
}
Controls.define('panel-sub-system-dock', {
    createInstance: PanelSubSystemDock,
    description: 'Area for sub system button icons.',
    classNames: ['sub-system-dock', 'allowCameraMovement'],
    styles: ["fs://game/base-standard/ui/sub-system-dock/panel-sub-system-dock.css"],
    images: [
        'fs://game/core/sub_agetimer.png',
        'fs://game/core/sub_tech.png',
        'fs://game/core/sub_civics.png',
        'fs://game/core/sub_govt.png',
        'fs://game/core/sub_resource.png',
        'fs://game/core/sub_greatworks.png',
        'fs://game/core/sub_religion.png',
        'fs://game/core/sub_greatworks.png',
        'fs://game/core/hud_age_circle_bk.png',
        'fs://game/core/hud_tech_circle_bk.png',
        'fs://game/core/hud_civic_circle_bk.png',
        'fs://game/core/hud_sub_circle_bk.png'
    ]
});

//# sourceMappingURL=file:///base-standard/ui/sub-system-dock/panel-sub-system-dock.js.map
