/**
 * @file model-place-building.ts
 * @copyright 2023, Firaxis Games
 * @description Data model for placing a building on a plot
 */
import BuildingPlacementManager, { BuildingPlacementSelectedPlotChangedEventName, BuildingPlacementConstructibleChangedEventName } from '/base-standard/ui/building-placement/building-placement-manager.js';
import CityYields from '/base-standard/ui/utilities/utilities-city-yields.js';
import { composeConstructibleDescription } from '/core/ui/utilities/utilities-core-textprovider.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
var ConstructibleIcons;
(function (ConstructibleIcons) {
	ConstructibleIcons["EMPTY"] = "BUILDING_OPEN";
	ConstructibleIcons["ADD"] = "BUILDING_ADD";
	ConstructibleIcons["WARNING"] = "BUILDING_WARNING";
})(ConstructibleIcons || (ConstructibleIcons = {}));

export const PlaceBuildingModelChangedEventName = 'place-building-model-changed';
export class PlaceBuildingModelChangedEvent extends CustomEvent {
	constructor() {
		super(PlaceBuildingModelChangedEventName, { bubbles: false, cancelable: true });
	}
}

class PlaceBuildingModel {
	constructor() {
		this.hasSelectedPlot = false;
		this.cityName = "";
		this.cityYields = [];
		this.isRepairing = false;
		this.selectedConstructibleInfo = {
			name: "",
			type: ConstructibleIcons.EMPTY,
			shouldShow: true,
			details: [],
			showPlacementIcon: false,
			showRepairIcon: false,
			collectionIndex: -1
		};
		this.selectPlotMessage = "";
		this.firstConstructibleSlot = {
			name: "",
			type: ConstructibleIcons.EMPTY,
			shouldShow: true,
			details: [],
			showPlacementIcon: false,
			showRepairIcon: false,
			collectionIndex: -1
		};
		this.secondConstructibleSlot = {
			name: "",
			type: ConstructibleIcons.EMPTY,
			shouldShow: true,
			details: [],
			showPlacementIcon: false,
			showRepairIcon: false,
			collectionIndex: -1
		};
		this.shouldShowOverbuild = false;
		this.overbuildText = "";
		this.overbuildConstructibleSlot = {
			name: "",
			type: ConstructibleIcons.EMPTY,
			shouldShow: true,
			details: [],
			showPlacementIcon: false,
			showRepairIcon: false,
			collectionIndex: -1
		};
		this.shouldShowUniqueQuarterText = false;
		this.uniqueQuarterText = "";
		this.uniqueQuarterWarning = "";
		this.shouldShowFromThisPlot = false;
		this.showDescription = false;
		this.shouldShowAdjacencyBonuses = false;
		this.yieldBreakdown = {
			adjacencyBonuses:			{},
			workerBonuses:				{},
			adjacencytoOthersBonuses:	{},
			warehouseBonuses:			{},
			baseYields:					{},
			baseYieldPenalty:			{}
		};
		this.baseYieldPenaltyType = -1 // -1 is null, 0 is potential loss, 1 rural development loss, 2 is overbuilding loss
		this.showYield		= {}
		this.yieldsTotal	= {}
		this.placementHeaderText = "";
		this.selectedPlotIndex = null;
		this.updateGate = new UpdateGate(() => {
			//=======================================================
			// Safety Checks
			//=======================================================
			const constructibleDef = BuildingPlacementManager.currentConstructible;
			if (!constructibleDef) {
				console.warn('model-place-building: Tried to update but BuildingPlacementManager does not have a valid constructible.');
				return;
			}
			const isImprovement = constructibleDef.ConstructibleClass == "IMPROVEMENT";
			const cityID = BuildingPlacementManager.cityID;
			if (!cityID) {
				console.warn('model-place-building: Tried to update but BuildingPlacementManager does not have a valid cityID.');
				return;
			}
			const city = Cities.get(cityID);
			if (!city) {
				console.warn(`model-place-building: Failed to get the city for cityID ${cityID} provided by BuildingPlacementManager.`);
				return;
			}
			//=======================================================
			// Determine if the building we're placing is part of a unique district
			//=======================================================
			let uniqueQuarterPlotIndex = -1;
			let uniqueQuarterDefinition = null;
			for (const uniqueDistrictDef of GameInfo.UniqueQuarters) {
				if (constructibleDef.ConstructibleType == uniqueDistrictDef.BuildingType1 || constructibleDef.ConstructibleType == uniqueDistrictDef.BuildingType2) {
					uniqueQuarterDefinition = uniqueDistrictDef;
					// If we do have a unique quarter determine if we already have placed one of the required buildings
					uniqueQuarterPlotIndex = BuildingPlacementManager.findExistingUniqueBuilding(uniqueDistrictDef);
				}
			}
			//=======================================================
			// Basic Info
			//=======================================================
			this.hasSelectedPlot = false;
			this.showYieldsBreakdown = false;
			this.cityName = city.name;
			this.cityYields = CityYields.getCityYieldDetails(cityID);
			this.isRepairing = BuildingPlacementManager.isRepairing;
			this.baseYieldPenaltyType = -1
			// Defaults for most cases
			this.shouldShowOverbuild = false;
			this.firstConstructibleSlot.shouldShow = true;
			this.firstConstructibleSlot.showRepairIcon = false;
			this.secondConstructibleSlot.shouldShow = true;
			this.secondConstructibleSlot.showRepairIcon = false;
			this.overbuildConstructibleSlot.shouldShow = true;
			this.overbuildConstructibleSlot.showRepairIcon = false;
			this.selectedConstructibleInfo.name = constructibleDef.Name;
			this.selectedConstructibleInfo.type = constructibleDef.ConstructibleType;
			this.selectedConstructibleInfo.details = [composeConstructibleDescription(constructibleDef.ConstructibleType, city)];

			const ExistingDistrictOnly = constructibleDef.ExistingDistrictOnly
			//=======================================================
			// On hovering over a plot
			//=======================================================
			if (this.selectedPlotIndex != null) {
				this.hasSelectedPlot = true;
				//=======================================================
				// initialise the yields breakdown table
				//=======================================================
				Object.entries(this.yieldBreakdown).forEach(([rowName, row]) => {
					GameInfo.Yields.forEach(yieldDefinition => {
						row[yieldDefinition.YieldType] = 0;
					})
				})
				GameInfo.Yields.forEach(yieldDefinition => {
					this.yieldsTotal[yieldDefinition.YieldType] = 0;
					this.showYield[yieldDefinition.YieldType] = false
				})

				if (!ExistingDistrictOnly){
					const placementPlotData = BuildingPlacementManager.getPlacementPlotData(this.selectedPlotIndex);
					placementPlotData?.changeDetails.forEach((changeDetails) => {
						const yieldDefinition = GameInfo.Yields.lookup(changeDetails.yieldType);
						if (!yieldDefinition) {
							return;
						}
						//------------------------
						// Get the correct row
						//------------------------
						let rowName
						switch (changeDetails.sourceType){
							case YieldSourceTypes.BASE:
								rowName = "baseYields";
								break;
							case YieldSourceTypes.WORKERS:
								rowName = "workerBonuses";
								break;
							case YieldSourceTypes.WAREHOUSE:
								rowName = "warehouseBonuses";
								break;
							case YieldSourceTypes.ADJACENCY:
								if (changeDetails.sourcePlotIndex == this.selectedPlotIndex){
									rowName = "adjacencytoOthersBonuses";
									break;
								} else {
									rowName = "adjacencyBonuses";
									break;
								}
							default:
								break;
						}

						if (changeDetails.change != 0){
							this.showYield[yieldDefinition.YieldType] = true
						}
						this.yieldsTotal[yieldDefinition.YieldType] += changeDetails.change; // We want to change the total even if we don't know where it's coming from
						if (!rowName){return};

						if (!this.yieldBreakdown[rowName][yieldDefinition.YieldType]){
							this.yieldBreakdown[rowName][yieldDefinition.YieldType] = 0
						};
						this.yieldBreakdown[rowName][yieldDefinition.YieldType] += changeDetails.change;
					})
					for (const value of Object.values(this.showYield)) {
						if (value){
							this.showYieldsBreakdown = true;
							break;
						}
					}
				}
				//=======================================================
				// Cache overbuilding and repairing information
				//=======================================================
				const overbuildConstructibleID = BuildingPlacementManager.getOverbuildConstructibleID(this.selectedPlotIndex);
				const selectedDistrict = Districts.getAtLocation(GameplayMap.getLocationFromIndex(this.selectedPlotIndex));
				if (selectedDistrict) {

					//=======================================================
					// We can't reliably just use idices 1 & 2
					// Certain structures like walls don't actually take up a slot
					//=======================================================
					const constructibles = selectedDistrict.getConstructibleIds();
					let index1 = -1;
					let index2 = -1;
					for (var i = constructibles.length - 1; i >= 0; i--) {
						const constructible = constructibles[i]
						const constructibleInfo = Constructibles.getByComponentID(constructible);
						const constructibleDef = GameInfo.Constructibles.lookup(constructibleInfo.type);
						if (constructibleDef){
							if(!constructibleDef.ExistingDistrictOnly){
								if (index1==-1){
									index1 = i
								} else {
									index2 = i
								}
							}
						}

						if (index1!=-1&&index2!=-1){break}
					}

					if (constructibles[index1]) {
						this.firstConstructibleSlot = this.getConstructibleInfoByComponentID(constructibles[index1]);
						if (ExistingDistrictOnly){
							this.placementHeaderText = Locale.compose("LOC_UI_CITY_VIEW_PLACE_HERE");
						} else if (this.isRepairing && this.firstConstructibleSlot.type == this.selectedConstructibleInfo.type) {
							this.placementHeaderText = Locale.compose("LOC_UI_CITY_VIEW_REPAIR", this.firstConstructibleSlot.name);
							this.firstConstructibleSlot.showRepairIcon = true;
							this.firstConstructibleSlot.showPlacementIcon = false;
						}
						else if (this.firstConstructibleSlot.collectionIndex == overbuildConstructibleID) {
							this.baseYieldPenaltyType = 2
							this.yieldBreakdown.baseYieldPenalty = this.getYieldsForConstructible(city, constructibles[index1].id);
							this.firstConstructibleSlot.showPlacementIcon = true;
							this.shouldShowOverbuild = true;
							this.overbuildConstructibleSlot = this.firstConstructibleSlot;
							this.overbuildText = Locale.compose("LOC_UI_CITY_VIEW_PLACE_OVER_DESC", this.firstConstructibleSlot.name);
							this.placementHeaderText = Locale.compose("LOC_UI_CITY_VIEW_PLACE_OVER", this.overbuildConstructibleSlot.name);
						}
						else {
							this.firstConstructibleSlot.showPlacementIcon = false;
						}
					}
					if (constructibles[index2]) {
						this.secondConstructibleSlot = this.getConstructibleInfoByComponentID(constructibles[index2]);
						if (ExistingDistrictOnly){
							this.placementHeaderText = Locale.compose("LOC_UI_CITY_VIEW_PLACE_HERE");
						} else if (this.isRepairing && this.secondConstructibleSlot.type == this.selectedConstructibleInfo.type) {
							this.placementHeaderText = Locale.compose("LOC_UI_CITY_VIEW_REPAIR", this.secondConstructibleSlot.name);
							this.secondConstructibleSlot.showRepairIcon = true;
							this.secondConstructibleSlot.showPlacementIcon = false;
						}
						else if (this.secondConstructibleSlot.collectionIndex == overbuildConstructibleID) {
							this.baseYieldPenaltyType = 2
							this.yieldBreakdown.baseYieldPenalty = this.getYieldsForConstructible(city, constructibles[index2].id);
							this.secondConstructibleSlot.showPlacementIcon = true;
							this.shouldShowOverbuild = true;
							this.overbuildConstructibleSlot = this.secondConstructibleSlot;
							this.overbuildText = Locale.compose("LOC_UI_CITY_VIEW_PLACE_OVER_DESC", this.secondConstructibleSlot.name);
							this.placementHeaderText = Locale.compose("LOC_UI_CITY_VIEW_PLACE_OVER", this.overbuildConstructibleSlot.name);
						}
						else {
							this.secondConstructibleSlot.showPlacementIcon = false;
						}
					} else {
						if (selectedDistrict.isUrbanCore) {
							// Urban plot but second slot is empty
							this.secondConstructibleSlot.type = ConstructibleIcons.EMPTY;
							this.firstConstructibleSlot.showPlacementIcon = false;
							this.secondConstructibleSlot.showPlacementIcon = true;
							this.placementHeaderText = Locale.compose("LOC_UI_CITY_VIEW_PLACE_HERE");
						}
						//------------------------------------
						// Rural plot which will get converted
						// to urban which adds a new slot
						//------------------------------------
						else {
							this.secondConstructibleSlot.type = isImprovement?ConstructibleIcons.EMPTY:ConstructibleIcons.ADD;
							this.firstConstructibleSlot.showPlacementIcon = true;
							this.secondConstructibleSlot.showPlacementIcon = false;
							this.overbuildConstructibleSlot = this.firstConstructibleSlot;
							if (this.isRepairing) {
								this.placementHeaderText = Locale.compose("LOC_UI_CITY_VIEW_REPAIR", this.firstConstructibleSlot.name);
								this.firstConstructibleSlot.showRepairIcon = true;
								this.firstConstructibleSlot.showPlacementIcon = false;
								this.secondConstructibleSlot.shouldShow = false;
								this.shouldShowOverbuild = false;
							}
							else {
								this.overbuildText = Locale.compose("LOC_UI_CITY_VIEW_PLACE_OVER_DESC", this.firstConstructibleSlot.name);
								this.shouldShowOverbuild = true;
								this.baseYieldPenaltyType = isImprovement?-1:1
								this.placementHeaderText = isImprovement?Locale.compose("LOC_UI_CITY_VIEW_PLACE_HERE"):Locale.compose("LOC_UI_CITY_VIEW_CONVERT_TO_URBAN_WARNING");
							}
						}
					}
				} else {
				//=======================================================
				// Developing an empty plot
				//=======================================================
					// Expanding and creating a new district on plot
					this.baseYieldPenaltyType = 0
					this.firstConstructibleSlot.type = ConstructibleIcons.EMPTY;
					this.firstConstructibleSlot.showPlacementIcon = true;
					this.secondConstructibleSlot.type = ConstructibleIcons.ADD;
					this.secondConstructibleSlot.showPlacementIcon = false;
					this.placementHeaderText = isImprovement?Locale.compose("LOC_UI_CITY_VIEW_PLACE_HERE"):Locale.compose("LOC_UI_CITY_VIEW_CONVERT_TO_URBAN_WARNING");
				}
				//=======================================================
				// Override Header Text to Indicate Unique Quarter name
				//=======================================================
				if (uniqueQuarterDefinition != null && this.selectedPlotIndex == uniqueQuarterPlotIndex) {
					// We're trying to place the last building in the correct unique quarter slot
					this.placementHeaderText = Locale.compose(uniqueQuarterDefinition.Name);
					this.shouldShowUniqueQuarterText = true;
					this.uniqueQuarterText = Locale.compose("LOC_UI_CITY_VIEW_UNIQUE_QUARTER_WILL_COMPLETE", this.selectedConstructibleInfo.name, uniqueQuarterDefinition.Name);
					this.uniqueQuarterWarning = "";
				} else if (uniqueQuarterDefinition != null && uniqueQuarterPlotIndex != -1) {
					// Warning that placing the last unique building here will make finishing the unique quarter impossible
					this.shouldShowUniqueQuarterText = true;
					this.uniqueQuarterText = "";
					this.uniqueQuarterWarning = Locale.compose("LOC_UI_CITY_VIEW_UNIQUE_QUARTER_CANT_COMPLETE", uniqueQuarterDefinition.Name);
				} else {
					this.shouldShowUniqueQuarterText = false;
				}
				//=======================================================
				// Cache yield penalties for development
				//=======================================================
				const location = GameplayMap.getLocationFromIndex(this.selectedPlotIndex);
				const playerID = GameContext.localPlayerID;

				if (this.baseYieldPenaltyType==0||this.baseYieldPenaltyType==1) {
					GameInfo.Yields.forEach(yieldDefinition => {
						const yieldAmount = -1 * GameplayMap.getYield(location.x, location.y, yieldDefinition.YieldType, playerID);
						this.yieldBreakdown.baseYieldPenalty[yieldDefinition.YieldType] += yieldAmount;
						if (yieldAmount != 0){
							this.showYield[yieldDefinition.YieldType] = true
						}
						if (this.baseYieldPenaltyType > 0){
							this.yieldsTotal[yieldDefinition.YieldType] += yieldAmount
						}
					});
				}
			}
			//=======================================================
			//=======================================================
			this.showDescription = !(this.showYieldsBreakdown)
			if (this._OnUpdate) {
				this._OnUpdate(this);
			}
			window.dispatchEvent(new PlaceBuildingModelChangedEvent());
		});
		this.onSelectedPlotChanged = () => {
			this.selectedPlotIndex = BuildingPlacementManager.selectedPlotIndex;
			this.updateGate.call('onSelectedPlotChanged');
		};
		this.onConstructibleChanged = () => {
			this.updateGate.call('onConstructibleChanged');
		};
		engine.whenReady.then(() => {
			window.addEventListener(BuildingPlacementSelectedPlotChangedEventName, this.onSelectedPlotChanged);
			window.addEventListener(BuildingPlacementConstructibleChangedEventName, this.onConstructibleChanged);
		});
	}
	set updateCallback(callback) {
		this._OnUpdate = callback;
	}
	getYieldStepForConstructible(constructibleID, yieldType, yields, step){
		if (step.description) {
			if (step.id == constructibleID){
				yields[yieldType] -= step.value
			} else {
				if (step.base && step.base.steps && step.base.steps.length > 0) {
					for (var i = step.base.steps.length - 1; i >= 0; i--) {
						this.getYieldStepForConstructible(constructibleID, yieldType, yields, step.base.steps[i])
					}
				}
			}
		} else {
			if (step.steps && step.steps.length > 0) {
				for (var i = step.steps?.length - 1; i >= 0; i--) {
					this.getYieldStepForConstructible(constructibleID, yieldType, yields, step.steps[i])
				}
			}
		}
	}
	getYieldsForConstructible(city, constructibleID){
		let yields = {};

		const cityYields = city.Yields;
		if (!cityYields) {
			console.error(`model-city-details: Failed to get city.Yields for ID ${selectedCityID}`);
			return;
		}

		const yieldData = cityYields.getYields()
		if (yieldData != null) {
			yieldData.forEach((y, i) => {
				const yieldInfo = GameInfo.Yields[i];

				if (yieldInfo) {
					const yieldType = yieldInfo.YieldType;
					yields[yieldType] = 0
					if (y.base.steps?.length) {
						for (var i = y.base.steps?.length - 1; i >= 0; i--) {
							this.getYieldStepForConstructible(constructibleID, yieldType, yields, y.base.steps[i])
						}
					}
					if (yields[yieldType] != 0){
						this.showYield[yieldType] = true;
						this.yieldsTotal[yieldType] += yields[yieldType]
					}
				}
			});
		}

		return yields
	}
	getConstructibleInfoByComponentID(constructibleID) {
		let constructibleInfo = {
			name: "",
			type: ConstructibleIcons.EMPTY,
			shouldShow: true,
			details: [],
			yields: {},
			showPlacementIcon: false,
			showRepairIcon: false,
			collectionIndex: -1
		};
		const cityID = BuildingPlacementManager.cityID;
		if (!cityID) {
			console.warn('model-place-building: getConstructibleInfoByComponentID(): Tried to update but BuildingPlacementManager does not have a valid cityID.');
			return constructibleInfo;
		}
		const city = Cities.get(cityID);
		if (!city) {
			console.warn(`model-place-building: getConstructibleInfoByComponentID(): Failed to get the city for cityID ${cityID} provided by BuildingPlacementManager.`);
			return constructibleInfo;
		}
		const constructible = Constructibles.getByComponentID(constructibleID);
		if (constructible) {
			const constructibleDefinition = GameInfo.Constructibles.lookup(constructible.type);
			if (constructibleDefinition) {
				constructibleInfo.name = constructibleDefinition.Name;
				constructibleInfo.details.push(composeConstructibleDescription(constructibleDefinition.ConstructibleType, city));
				constructibleInfo.type = constructibleDefinition.ConstructibleType;
				constructibleInfo.collectionIndex = constructibleDefinition.$index;
			}
			else {
				console.error(`model-place-building: Failed to get constructible definition for type ${constructible.type}`);
			}
		}
		else {
			console.error(`model-place-building: Failed to get constructible for id ${constructibleID}`);
		}
		return constructibleInfo;
	}
}
const PlaceBuilding = new PlaceBuildingModel();
engine.whenReady.then(() => {
	const updateModel = () => {
		engine.updateWholeModel(PlaceBuilding);
	};
	engine.createJSModel('g_PlaceBuilding', PlaceBuilding);
	PlaceBuilding.updateCallback = updateModel;
});
export { PlaceBuilding as default };

//# sourceMappingURL=file:///base-standard/ui/place-building/model-place-building.js.map
