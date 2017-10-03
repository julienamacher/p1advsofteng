import { Injectable } from '@angular/core';
import {Http, Headers, Response, RequestOptions} from "@angular/http";
import { Observable } from 'rxjs/Rx';
import { ServerValidationErrorEncapsulationModule } from "./../ServerValidationError";
import { HTTPHelperEncapsulationModule } from "./../HTTPHelper";
import { ConfigService } from "./config.service";

@Injectable()
export class TagService {
   constructor(private http: Http, private configService: ConfigService) {
   }
 
   getTags(): Observable<string[]> {
      return this.http.get(this.configService.getConfig().basehost + "/tags/")
         .map((res: Response) => res.json())
         .catch((error: any) => Observable.throw(error.json().error || 'Server error'));
   }
   
   deleteTag(tagId) {
      return this.http.delete(this.configService.getConfig().basehost + "/tags/" + tagId).catch((err: Response) => {
			return HTTPHelperEncapsulationModule.HTTPHelper.processError(err);
      });
   }
   
   renameTag(tagId, newTagId) {
      return this.http.patch(this.configService.getConfig().basehost + "/tags/" + tagId, { "name": newTagId }).catch((err: Response) => {
			return HTTPHelperEncapsulationModule.HTTPHelper.processError(err);
      });
   }
   
   createTag(tagId) {
      return this.http.post(this.configService.getConfig().basehost + "/tags/", { "name": tagId }).catch((err: Response) => {
			return HTTPHelperEncapsulationModule.HTTPHelper.processError(err);
      });
   }
}