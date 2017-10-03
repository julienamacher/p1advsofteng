import { Observable } from 'rxjs/Rx';
import { ServerValidationErrorEncapsulationModule } from "./ServerValidationError";

export module HTTPHelperEncapsulationModule {
	export class HTTPHelper {
		public static processError(err) {
			if (err.status == 400) {
				try {
					var json = err.json();
				
					if (json.validation) {
						// keys example: ["title", "username"]
						return Observable.throw(new ServerValidationErrorEncapsulationModule.ServerValidationError(json.validation.keys));
					}
				} catch (e) {}
			}
	  
			return Observable.throw(err);
		}
	}
}
