import { Injectable } from '@angular/core';

@Injectable()
export class ConfigService {
  getConfig() {
	return {
		'basehost': 'http://127.0.0.1:5000'
	};
  }
}