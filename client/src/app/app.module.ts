import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { TodosComponent } from './todos.component';
import { TagsComponent } from './tags.component';
import { ServerValidationErrorEncapsulationModule } from './ServerValidationError';
import { HTTPHelperEncapsulationModule } from "./HTTPHelper";

import { TodoService } from './services/todo.service';
import { TagService } from './services/tag.service';
import { ConfigService } from './services/config.service';

import { RouterModule, Routes } from '@angular/router';

import { HttpModule } from '@angular/http';

import {NgbModule} from '@ng-bootstrap/ng-bootstrap';

import { FormsModule } from '@angular/forms';

const appRoutes: Routes = [
  { path: 'todos', component: TodosComponent },
  { path: 'tags', component: TagsComponent },
  { path: '',
    redirectTo: '/todos',
    pathMatch: 'full'
  }
];

@NgModule({
  declarations: [
    AppComponent,
	TodosComponent,
	TagsComponent
  ],
  imports: [
	RouterModule.forRoot(
      appRoutes,
      { enableTracing: true } // <-- debugging purposes only
    ),
	NgbModule.forRoot(),
    BrowserModule,
	HttpModule,
	FormsModule
  ],
  providers: [TodoService,TagService,ConfigService],
  bootstrap: [AppComponent]
})
export class AppModule { }
