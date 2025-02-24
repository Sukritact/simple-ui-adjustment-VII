/**
 * @file panel-place-building.ts
 * @copyright 2023-2024, Firaxis Games
 * @description Displays all the useful information when attempting to place a building on a plot
 */
import PlaceBuilding, { PlaceBuildingModelChangedEventName } from '/base-standard/ui/place-building/model-place-building.js';
import { InterfaceMode, InterfaceModeChangedEventName } from '/core/ui/interface-modes/interface-modes.js';
import { MustGetElement } from "/core/ui/utilities/utilities-dom.js";
import Panel from '/core/ui/panel-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
class PlaceBuildingPanel extends Panel {
	constructor(root) {
		super(root);
		this.content = null;
		this.subsystemFrame = document.createElement("fxs-subsystem-frame");
		this.requestClose = () => {
			const selectedCityID = InterfaceMode.getParameters().CityId != null ? InterfaceMode.getParameters().CityId : UI.Player.getHeadSelectedCity(); // May be null if placing results in deselecting city		
			if (selectedCityID && ComponentID.isValid(selectedCityID)) {
				InterfaceMode.switchTo("INTERFACEMODE_CITY_PRODUCTION", { CityID: selectedCityID });
				super.close();
			}
			else {
				// If we still don't have a CityId something has gone very wrong so we'll be safe a kick back to the world.
				InterfaceMode.switchTo("INTERFACEMODE_DEFAULT");
			}
		};
		this.onInterfaceModeChanged = () => {
			switch (InterfaceMode.getCurrent()) {
				case "INTERFACEMODE_PLACE_BUILDING":
					this.setHidden(false);
					break;
				default:
					this.setHidden(true);
					break;
			}
		};
		this.animateInType = this.animateOutType = 5 /* AnchorType.RelativeToLeft */;
		this.inputContext = InputContext.Shell;

		this.negativeColor 	= "#b43e31";
		this.borderColor 	= "#877b6544";
		this.totalColor 	= "#877b6522";
		this.borderWidth 	= 0.12;
		this.cellWidth		= 2.5;
		this.cellHeight		= 2.5;
		this.iconSize		= 1.7777777778;
		this.iconOffset		= (this.cellHeight - this.iconSize)/2
	}
	onInitialize() {
		this.Root.setAttribute("tabindex", "-1");
		this.Root.classList.add("panel-place-building", "flex-auto", "font-body", "text-base", "pt-12", "pl-6", "h-screen", "relative");
		this.buildView();
		this.setHidden(true);
	}
	onAttach() {
		super.onAttach();
		window.addEventListener(PlaceBuildingModelChangedEventName, this.onPlaceBuildingModelChanged.bind(this));
		window.addEventListener(InterfaceModeChangedEventName, this.onInterfaceModeChanged);
		this.subsystemFrame.addEventListener('subsystem-frame-close', this.requestClose);
	}
	onDetach() {
		window.removeEventListener(PlaceBuildingModelChangedEventName, this.onPlaceBuildingModelChanged);
		window.removeEventListener(InterfaceModeChangedEventName, this.onInterfaceModeChanged);
		this.subsystemFrame.removeEventListener('subsystem-frame-close', this.requestClose);
		super.onDetach();
	}
	onReceiveFocus() {
		if (this.content) {
			FocusManager.setFocus(this.content);
		}
	}
	buildView() {
		const fragment = document.createDocumentFragment();
		const container = document.createElement('div');
		container.classList.add('flex', 'flex-col', 'w-128', 'pointer-events-none', 'mr-6', 'top-10', 'bottom-0', 'absolute');
		this.buildMainPanel();
		container.appendChild(this.subsystemFrame);
		fragment.appendChild(container);
		this.Root.appendChild(fragment);
	}
	buildMainPanel() {
		this.subsystemFrame.innerHTML = `
				<fxs-header class="uppercase tracking-100 mt-2" title="LOC_UI_CITY_VIEW_BUILDING_PLACEMENT" filigree-style="small"></fxs-header>
				<div class="uppercase font-title text-secondary text-xl self-center" data-bind-attr-data-l10n-id="{{g_PlaceBuilding.selectedConstructibleInfo.name}}"></div>
				<div tabindex="-1" class="flex flex-col mx-2 mb-8">
				<div class="flex items-start m-1" data-bind-if="{{g_PlaceBuilding.showDescription}}">
					<fxs-icon class="size-20 mx-2" data-bind-attr-data-icon-id="{{g_PlaceBuilding.selectedConstructibleInfo.type}}"></icon>
					<div class="flex flex-col pr-26">
						<div class="" data-bind-for="entry:{{g_PlaceBuilding.selectedConstructibleInfo.details}}" data-bind-attr-data-l10n-id="{{entry}}"></div>
					</div>
				</div>
				<fxs-header class="uppercase my-2" data-bind-attr-title="{{g_PlaceBuilding.placementHeaderText}}" data-bind-if="{{g_PlaceBuilding.hasSelectedPlot}}" filigree-style="none"></fxs-header>
				<div class="flex flex-col self-center" data-bind-if="{{g_PlaceBuilding.shouldShowOverbuild}}">
					<div data-bind-value="{{g_PlaceBuilding.overbuildText}}"></div>
				</div>
				<div class="flex flex-col self-center my-2" data-bind-if="{{g_PlaceBuilding.shouldShowUniqueQuarterText}}">
					<div class="self-center text-center" data-bind-value="{{g_PlaceBuilding.uniqueQuarterText}}"></div>
					<div class="self-center text-center text-negative" data-bind-value="{{g_PlaceBuilding.uniqueQuarterWarning}}"></div>
				</div>
				<div class="flex self-center" data-bind-if="{{g_PlaceBuilding.hasSelectedPlot}}">
					<fxs-icon class="size-14 flex justify-center items-center mx-2" data-bind-attr-data-icon-id="{{g_PlaceBuilding.firstConstructibleSlot.type}}" data-bind-if="{{g_PlaceBuilding.firstConstructibleSlot.shouldShow}}">
						<fxs-icon class="size-12" data-icon-id="BUILDING_PLACE" data-bind-if="{{g_PlaceBuilding.firstConstructibleSlot.showPlacementIcon}}"></fxs-icon>
						<fxs-icon class="size-12" data-icon-id="CITY_REPAIR" data-bind-if="{{g_PlaceBuilding.firstConstructibleSlot.showRepairIcon}}"></fxs-icon>
					</fxs-icon>
					<fxs-icon class="size-14 flex justify-center items-center mx-2" data-bind-attr-data-icon-id="{{g_PlaceBuilding.secondConstructibleSlot.type}}" data-bind-if="{{g_PlaceBuilding.secondConstructibleSlot.shouldShow}}">
						<fxs-icon class="size-12" data-icon-id="BUILDING_PLACE" data-bind-if="{{g_PlaceBuilding.secondConstructibleSlot.showPlacementIcon}}"></fxs-icon>
						<fxs-icon class="size-12" data-icon-id="CITY_REPAIR" data-bind-if="{{g_PlaceBuilding.secondConstructibleSlot.showRepairIcon}}"></fxs-icon>
					</fxs-icon>
				</div>
				<fxs-header class="uppercase tracking-100 mt-2" title="LOC_UI_CITY_DETAILS_YIELDS_TAB" filigree-style="h4" data-bind-if="{{g_PlaceBuilding.showYieldsBreakdown}}"></fxs-header>
				<div style="height: 0.8rem" data-bind-if="{{g_PlaceBuilding.showYieldsBreakdown}}"></div>
				<div class="yield-breakdown-container flex">
					<div class="yield-breakdown"></div>
				</div>
				<div style="height: 0.8rem" data-bind-if="{{g_PlaceBuilding.showYieldsBreakdown}}"></div>
				<fxs-header class="uppercase tracking-100 mt-2" title="LOC_SUK_SUA_PLACE_BLD_KEY" filigree-style="h4" data-bind-if="{{g_PlaceBuilding.showYieldsBreakdown}}"></fxs-header>
				<div class="flex flex-wrap justify-between" style="max-width: 95%;" data-bind-if="{{g_PlaceBuilding.showYieldsBreakdown}}">
					<div class="flex items-center" style="width: 50%;">
						<div class="size-8" style="margin-right:0.4rem;background-size: contain;background-image:url(
							fs://game/sukritacts_simple_ui_adjustments/textures/Suk_SUA_AdjacencyBonus.png
							);"></div>
						<div class="my-2" style="max-width: 85%; font-size:0.85rem; line-height:0.85rem;" data-l10n-id="LOC_SUK_SUA_PLACE_BLD_ADJACENCIES"></div>
					</div>
					<div class="flex items-center" style="width: 50%;">
						<div class="size-8" style="margin-right:0.4rem;background-size: contain;background-image:url(
							fs://game/sukritacts_simple_ui_adjustments/textures/Suk_SUA_SpecialistBonus.png
							);"></div>
						<div class="my-2" style="max-width: 85%; font-size:0.85rem; line-height:0.85rem;" data-l10n-id="LOC_SUK_SUA_PLACE_BLD_WORKERS"></div>
					</div>
					<div class="flex items-center" style="width: 50%;">
						<div class="size-8" style="margin-right:0.4rem;background-size: contain;background-image:url(
							fs://game/sukritacts_simple_ui_adjustments/textures/Suk_SUA_ToOthers.png
							);"></div>
						<div class="my-2" style="max-width: 85%; font-size:0.85rem; line-height:0.85rem;" data-l10n-id="LOC_SUK_SUA_PLACE_BLD_TO_OTHERS"></div>
					</div>
					<div class="flex items-center" style="width: 50%;">
						<div class="size-8" style="margin-right:0.4rem;background-size: contain;background-image:url(
							fs://game/sukritacts_simple_ui_adjustments/textures/Suk_SUA_WarehouseBonus.png
							);"></div>
						<div class="my-2" style="max-width: 85%; font-size:0.85rem; line-height:0.85rem;" data-l10n-id="LOC_SUK_SUA_PLACE_BLD_WAREHOUSE"></div>
					</div>
					<div class="flex items-center" style="width: 50%;">
						<div class="size-8" style="margin-right:0.4rem;background-size: contain;background-image:url(
							fs://game/sukritacts_simple_ui_adjustments/textures/Suk_SUA_BaseYield.png
							);"></div>
						<div class="my-2" style="max-width: 85%; font-size:0.85rem; line-height:0.85rem;" data-l10n-id="LOC_SUK_SUA_PLACE_BLD_BASE_YIELD"></div>
					</div>
					<div class="flex items-center" style="width: 50%;">
						<div class="size-8" style="margin-right:0.4rem;background-size: contain;background-image:url(
							fs://game/sukritacts_simple_ui_adjustments/textures/Suk_SUA_PotentialLoss.png
							);"></div>
						<div class="my-2" style="max-width: 85%; font-size:0.85rem; line-height:0.85rem;" data-l10n-id="LOC_SUK_SUA_PLACE_BLD_UNWORKED"></div>
					</div>
					<div class="flex items-center" style="width: 50%;">
						<div class="size-8" style="margin-right:0.4rem;background-size: contain;background-image:url(
							fs://game/sukritacts_simple_ui_adjustments/textures/Suk_SUA_DevelopmentLoss.png
							);"></div>
						<div class="my-2" style="max-width: 85%; font-size:0.85rem; line-height:0.85rem;" data-l10n-id="LOC_SUK_SUA_PLACE_BLD_OVERBUILD"></div>
					</div>
				</div>
			</div>
		`;

		waitForLayout(() => {
			this.content = MustGetElement(".subsystem-frame__content", this.subsystemFrame);
			this.content.setAttribute("proxy-mouse", "true");
			this.content.setAttribute("handle-gamepad-pan", "true");
			this.content.componentCreatedEvent.on(component => { component.setEngineInputProxy(document.body); });
		});
	}
	createRow(){
		const yieldRow = document.createElement("div");
		yieldRow.style.setProperty("display", "flex");
		yieldRow.style.setProperty("justify-content", "center");
		return yieldRow
	}
	createCell(){
		const yieldDiv = document.createElement("div");
		yieldDiv.style.setProperty("display", "flex");
		yieldDiv.style.setProperty("width", this.cellWidth+"rem");
		yieldDiv.style.setProperty("height", this.cellHeight+"rem");
		yieldDiv.style.setProperty("justify-content", "center");
		yieldDiv.style.setProperty("font-weight", 700);
		yieldDiv.style.setProperty("line-height", this.cellHeight+"rem");
		yieldDiv.style.setProperty("position", "relative");

		return yieldDiv;
	}
	onPlaceBuildingModelChanged() {
		const yieldsBreakdownCont = MustGetElement(".yield-breakdown-container", this.subsystemFrame)
		yieldsBreakdownCont.style.setProperty("width", "100%");
		yieldsBreakdownCont.style.setProperty("justify-content", "center");
		const yieldsBreakdown = MustGetElement(".yield-breakdown", this.subsystemFrame);
		yieldsBreakdown.style.setProperty("border",	"");
		yieldsBreakdown.innerHTML = ""

		if (!g_PlaceBuilding.showYieldsBreakdown){return}

		yieldsBreakdown.style.setProperty("border",	this.borderWidth + "rem solid " + this.borderColor);

		//------------------------
		// Create Header
		//------------------------
		let yieldRow = this.createRow();
		let initColumn = this.createCell();
		initColumn.style.setProperty("border-bottom",	this.borderWidth + "rem solid " + this.borderColor)
		initColumn.style.setProperty("border-right",	this.borderWidth + "rem solid " + this.borderColor)
		yieldRow.appendChild(initColumn);
		GameInfo.Yields.forEach(yieldDefinition => {
			if (g_PlaceBuilding.showYield[yieldDefinition.YieldType]){
				const yieldDiv = this.createCell();
				const yieldIcon = document.createElement("fxs-icon");
				yieldIcon.classList.add("size-8");
				yieldIcon.style.setProperty("position", "absolute");
				yieldIcon.style.setProperty("top", this.iconOffset+"rem");
				yieldIcon.setAttribute("data-icon-id", yieldDefinition.YieldType);

				yieldDiv.appendChild(yieldIcon);
				yieldDiv.style.setProperty("border-bottom", this.borderWidth + "rem solid " + this.borderColor)
				yieldRow.appendChild(yieldDiv);
			}
		})
		yieldsBreakdown.appendChild(yieldRow);
		//------------------------
		// Then for each yield source
		//------------------------
		Object.entries(g_PlaceBuilding.yieldBreakdown).forEach(([key, row]) => {

			let iconCSS;
			switch (key){
				case "baseYields":
					iconCSS = 'url("fs://game/sukritacts_simple_ui_adjustments/textures/Suk_SUA_BaseYield.png")';
					break;
				case "adjacencyBonuses":
					iconCSS = 'url("fs://game/sukritacts_simple_ui_adjustments/textures/Suk_SUA_AdjacencyBonus.png")';
					break;
				case "workerBonuses":
					iconCSS = 'url("fs://game/sukritacts_simple_ui_adjustments/textures/Suk_SUA_SpecialistBonus.png")';
					break;
				case "adjacencytoOthersBonuses":
					iconCSS = 'url("fs://game/sukritacts_simple_ui_adjustments/textures/Suk_SUA_ToOthers.png")';
					break;
				case "warehouseBonuses":
					iconCSS = 'url("fs://game/sukritacts_simple_ui_adjustments/textures/Suk_SUA_WarehouseBonus.png")';
					break;
				case "baseYieldPenalty":
					if (g_PlaceBuilding.baseYieldPenaltyType > 0) {
						iconCSS = 'url("fs://game/sukritacts_simple_ui_adjustments/textures/Suk_SUA_DevelopmentLoss.png")';
					} else {
						iconCSS = 'url("fs://game/sukritacts_simple_ui_adjustments/textures/Suk_SUA_PotentialLoss.png")';
					}
					break;
				default:
					break;
			}

			if (iconCSS){
				let addRow = false
				const values = Object.values(row)
				for (const element of values) {
					if(element!=0){
						addRow = true;
						break;
					}
				}
				if(!addRow){return}

				yieldRow = this.createRow();

				const bonusDiv = this.createCell();
				bonusDiv.style.setProperty("border-right",	this.borderWidth + "rem solid " + this.borderColor)
				const bonusIcon = document.createElement("div");
				bonusIcon.classList.add("size-8");
				bonusIcon.style.setProperty("background-image", iconCSS);
				bonusIcon.style.setProperty("background-size", "contain");
				bonusIcon.style.setProperty("image-rendering", "smooth");
				bonusIcon.style.setProperty("position", "absolute");
				bonusIcon.style.setProperty("top", this.iconOffset+"rem");
				bonusDiv.appendChild(bonusIcon);
				yieldRow.appendChild(bonusDiv);

				GameInfo.Yields.forEach(yieldDefinition => {
					if (g_PlaceBuilding.showYield[yieldDefinition.YieldType]){
						const yieldDiv = this.createCell();
						const yieldChange = row[yieldDefinition.YieldType]

						yieldDiv.innerHTML = yieldChange;
						if (yieldChange==0){
							yieldDiv.innerHTML = "-"
							yieldDiv.style.setProperty("opacity", 0.5);
						}
						if (key=="baseYieldPenalty"&&g_PlaceBuilding.baseYieldPenaltyType<=0){
							yieldDiv.style.setProperty("opacity", 0.5);
						}
						if (yieldChange < 0){
							yieldDiv.style.setProperty("color", this.negativeColor);
						}
						yieldRow.appendChild(yieldDiv);
					}
				})
			}
			yieldsBreakdown.appendChild(yieldRow);
		})
		//------------------------
		// Then finally, the total yield
		//------------------------
		yieldRow = this.createRow();
		initColumn = this.createCell();
		//initColumn.innerHTML = Locale.compose("LOC_PROFILE_CHALLENGE_COMPLETION_TOTAL");
		initColumn.style.setProperty("border-top", 		this.borderWidth + "rem solid " + this.borderColor)
		initColumn.style.setProperty("border-right",	this.borderWidth + "rem solid " + this.borderColor)
		initColumn.style.setProperty("background-color", this.totalColor);
		yieldRow.appendChild(initColumn);
		GameInfo.Yields.forEach(yieldDefinition => {
			const yieldChange = g_PlaceBuilding.yieldsTotal[yieldDefinition.YieldType]
			if (g_PlaceBuilding.showYield[yieldDefinition.YieldType]){
				const yieldDiv = this.createCell();
				yieldDiv.style.setProperty("background-color", this.totalColor);
				yieldDiv.style.setProperty("border-top", this.borderWidth + "rem solid " + this.borderColor)
				yieldDiv.innerHTML = yieldChange
				if (yieldChange < 0){
					yieldDiv.style.setProperty("color", this.negativeColor);
				}
				yieldRow.appendChild(yieldDiv);
			}
		})
		yieldsBreakdown.appendChild(yieldRow);
		//------------------------
		//------------------------
	}
	setHidden(hidden) {
		this.Root.classList.toggle("hidden", hidden);
	}
}
Controls.define('panel-place-building', {
	createInstance: PlaceBuildingPanel,
	description: '',
	classNames: ['panel-place-building']
});

//# sourceMappingURL=file:///base-standard/ui/place-building/panel-place-building.js.map
