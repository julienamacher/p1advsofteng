import { Injectable } from '@angular/core';
import {Http, Headers, Response, RequestOptions} from "@angular/http";
import { Observable } from 'rxjs/Rx';
import { Todo } from "./../models/todo";
import { ServerValidationErrorEncapsulationModule } from "./../ServerValidationError";
import { HTTPHelperEncapsulationModule } from "./../HTTPHelper";
import { ConfigService } from "./config.service";

@Injectable()
export class TodoService {
   constructor(private http: Http, private configService: ConfigService) {
   }
 
   getTodos(restrictToTag): Observable<Todo[]> {
   
		var queryParams = '';
		
		if (restrictToTag != null) {
			queryParams = '?tag=' + restrictToTag;
		}
   
      return this.http.get(this.configService.getConfig().basehost + "/todos/" + queryParams)
         .map((res: Response) => res.json())
         .catch((error: any) => Observable.throw(error.json().error || 'Server error'));
   }
   
   updateTodo(todo) {
		let headers = new Headers({ 'Content-Type': 'application/json' });
		let options = new RequestOptions({ 'headers': headers });

		let copyToSend = JSON.parse(JSON.stringify(todo));
		delete copyToSend.id;
		delete copyToSend.url;
		
		if (copyToSend.hasOwnProperty('enableTodoTitleEdition'))
			delete copyToSend.enableTodoTitleEdition;
			
		if (copyToSend.hasOwnProperty('errors'))
			delete copyToSend.errors;
			
		if (copyToSend.hasOwnProperty('newTitle'))
			delete copyToSend.newTitle;
		
		return this.http.patch(this.configService.getConfig().basehost + "/todos/" + todo.id, copyToSend, options).catch((err: Response) => {
			return HTTPHelperEncapsulationModule.HTTPHelper.processError(err);
      });
   }
   
   deleteTodo(todoId) {
		return this.http.delete(this.configService.getConfig().basehost + "/todos/" + todoId);
   }
   
   createTodo(todo) {
      return this.http.post(this.configService.getConfig().basehost + "/todos/", todo).map((res:Response)=>res.json()).catch((err: Response) => {
			return HTTPHelperEncapsulationModule.HTTPHelper.processError(err);
      });
   }
}