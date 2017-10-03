export module ServerValidationErrorEncapsulationModule {
	export class ServerValidationError extends Error {
		invalidFields: string[];

		constructor(invf: string[]) {
			super("Data validation failed server-side");
			this.invalidFields = invf;
			Object.setPrototypeOf(this, ServerValidationError.prototype);
		}

		getInvalidFields() {
			return this.invalidFields;
		}
	}
}
