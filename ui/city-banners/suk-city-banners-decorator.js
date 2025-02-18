export class Suk_CityBannersDecorator {

    constructor(component) {
        this.component = component;
        this.observerConfig = { attributes: true, attributeFilter: ['value', 'max-value'] }; // currentFood and nextThreshold
        this.observer = new MutationObserver(this.onGrowthUpdated.bind(this.component));
    }

    onGrowthUpdated() {
        // this == this.component in this function because of .bind(this.component) above.

        // Do a safety check first
        if (this.city == null) {
            console.error("this.city is null when growth is updated.");
            return;
        }
        // **NEW** to current logic. 
        // Do a check for only local player's city because technically you should not see other player's city details.
        if (this.city.owner != GameContext.localPlayerID) {
            return;
        }
        const population = this.city.population;

        // Code below are purely copied from setPopulation(population) except the second last line.
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

        // Get growthQueue through querySelector.
        const growthQueue = this.Root.querySelector(".city-banner__population-container");
        growthQueue.setAttribute("data-tooltip-content", container.innerHTML);
        container.remove()
    }

    beforeAttach() {
        // Hook up to growthQueueMeter's updates, which will be updated when currentFood or population is updated.
        this.observer.observe(this.component.elements.growthQueueMeter, this.observerConfig);
    }

    afterAttach() {
    }

    beforeDetach() {
    }

    afterDetach() {
        this.observer.disconnect();
    }
}

Controls.decorate('city-banner', (component) => new Suk_CityBannersDecorator(component));