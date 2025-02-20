export class Suk_CelebrationTurnCounter {
//------------------------------------------
	constructor(component) {
		this.component			= component;
		this.turnCounterContent = document.createElement('div');

        this.observerConfig = {attributes: true, attributeFilter: ['data-tooltip-content'] }; // currentFood and nextThreshold
        this.observer = new MutationObserver(this.updateTimers.bind(this));
	}

	beforeAttach() {
		const policiesButtonContainer = document.createElement('div');
		policiesButtonContainer.classList.add("ssb__button", "ssb__element");
		policiesButtonContainer.style.setProperty("position", "relative");
		this.component.buttonContainer.replaceChild(policiesButtonContainer, this.component.policiesButton)

		const turnCounter = document.createElement('div');
		turnCounter.classList.add("ssb-button__turn-counter");
		turnCounter.style.setProperty("position", "absolute");
		turnCounter.style.setProperty("top", "2.65rem");
		turnCounter.style.setProperty("left", "0.78rem");
		turnCounter.style.setProperty("width", "1.5rem");
		turnCounter.style.setProperty("height", "1.8rem");
		turnCounter.style.setProperty("background-size", "100% 100%");
		turnCounter.style.setProperty("background-repeat", "no-repeat");
		turnCounter.style.setProperty("background-image", 'url("fs://game/sukritacts_simple_ui_adjustments/textures/Suk_TurnCounter_Backing.png")');

		const turnCounterContent = this.turnCounterContent
		turnCounterContent.classList.add("ssb-button__turn-counter-content", "font-title-base");
		turnCounter.appendChild(turnCounterContent);

		this.component.policiesButton.style.setProperty("position", "absolute");
		policiesButtonContainer.appendChild(turnCounter)
		policiesButtonContainer.appendChild(this.component.policiesButton)

		this.observer.observe(this.component.policiesButton, this.observerConfig);
		this.updateTimers()
	}

	updateTimers() {
		const localPlayer = Players.get(GameContext.localPlayerID);
		if(!localPlayer){return}
		const localPlayerHappiness = localPlayer.Happiness;
		if(!localPlayerHappiness){return}
		const localPlayerStats = localPlayer?.Stats;
		if(!localPlayerStats){return}

		const turnCounterContent = this.turnCounterContent
		if (localPlayerHappiness.isInGoldenAge()) {
			const goldenAgeTurnsLeft = localPlayerHappiness.getGoldenAgeTurnsLeft();
			turnCounterContent.style.setProperty("color", "orange")
			turnCounterContent.innerHTML = Locale.stylize("[B]"+ goldenAgeTurnsLeft);
		} else {
			const happinessPerTurn = localPlayerStats.getNetYield(YieldTypes.YIELD_HAPPINESS) ?? -1;
			const nextGoldenAgeThreshold = localPlayerHappiness.nextGoldenAgeThreshold;
			const happinessTotal = Math.ceil(localPlayerStats.getLifetimeYield(YieldTypes.YIELD_HAPPINESS)) ?? -1;
			const turnsToNextGoldenAge = Math.ceil((nextGoldenAgeThreshold - happinessTotal) / happinessPerTurn);

			turnCounterContent.style.setProperty("color", "")
			if (isFinite(turnsToNextGoldenAge)){
				turnCounterContent.innerHTML = turnsToNextGoldenAge;
			} else {
				turnCounterContent.innerHTML = "";
			}

		}
	}

	afterAttach() {
	}

	beforeDetach() {
	}

	afterDetach() {
		//this.observer.disconnect();
	}
}

Controls.decorate('panel-sub-system-dock', (component) => new Suk_CelebrationTurnCounter(component));