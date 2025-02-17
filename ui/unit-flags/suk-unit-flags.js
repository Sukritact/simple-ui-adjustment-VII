import { Layout } from '/core/ui/utilities/utilities-layout.js';
import { UnitFlagFactory, UnitFlagManager } from '/base-standard/ui/unit-flags/unit-flag-manager.js';
import { GenericUnitFlag } from '/base-standard/ui/unit-flags/unit-flags.js';
import { IndependentPowersUnitFlag } from '/base-standard/ui/unit-flags/unit-flags-independent-powers.js';

function suk_checkUnitPosition(unit) {
	const units = MapUnits.getUnits(unit.location.x, unit.location.y);
	const plotCity = MapCities.getCity(unit.location.x, unit.location.y)
	const numUnits = units.length
	if (numUnits > 0) {
		let offset = (-numUnits/2) + 1;

		for (let u = 0; u < numUnits; u++) {
			const unitFlag = UnitFlagManager.instance.getFlag(units[u]);
			if (!unitFlag) {
				//console.error("unit-flags: checkUnitPosition(): Unit flag's for unit " + ComponentID.toLogString(units[u]) + " is not found");
				return;
			}
			unitFlag.updateTop(offset, !!plotCity);
			offset += 1;
		}
	}
}
function suk_updateTop(position, cityOnPlot) {
	if (this.unitContainer) {
		this.unitContainer.style.left = Layout.pixels(position * -this.horizontalOffset);
		this.unitContainer.style.top = Layout.pixels(cityOnPlot?this.verticalOffset:0);
	}
}

let verticalOffset = 8;
let horizontalOffset = 32;

GenericUnitFlag.prototype.verticalOffset = GenericUnitFlag.prototype.verticalOffset?GenericUnitFlag.prototype.verticalOffset:verticalOffset
GenericUnitFlag.prototype.horizontalOffset = GenericUnitFlag.prototype.horizontalOffset?GenericUnitFlag.prototype.horizontalOffset:horizontalOffset
IndependentPowersUnitFlag.prototype.verticalOffset = IndependentPowersUnitFlag.prototype.verticalOffset?IndependentPowersUnitFlag.prototype.verticalOffset:verticalOffset
IndependentPowersUnitFlag.prototype.horizontalOffset = IndependentPowersUnitFlag.prototype.horizontalOffset?IndependentPowersUnitFlag.prototype.horizontalOffset:horizontalOffset

GenericUnitFlag.prototype.checkUnitPosition				= suk_checkUnitPosition;
GenericUnitFlag.prototype.updateTop						= suk_updateTop;
IndependentPowersUnitFlag.prototype.checkUnitPosition 	= suk_checkUnitPosition;
IndependentPowersUnitFlag.prototype.updateTop			= suk_updateTop;
