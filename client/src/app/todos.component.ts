import { Component } from '@angular/core';

import { TodoService } from "app/services/todo.service";
import { TagService } from "app/services/tag.service";
import { Todo } from "app/models/todo";
import { ServerValidationErrorEncapsulationModule } from "./ServerValidationError";

@Component({
  selector: 'todos-root',
  templateUrl: './todos.component.html',
  styleUrls: ['./todos.component.css']
})
export class TodosComponent {
  errors: string[];
  tags: string[];
  todos : Todo[];
  todoService;
  tagService;
  newTodoTitle = "";
  
  mode = {
		'view': 'all',
		'restrictedTo': ''
  };
  
  resetRestrictionOnTag() {
	this.mode = {
		'view': 'all',
		'restrictedTo': ''
	};
	
	this.getTodos();
  }
  
  restrictToTag(tag) {
	this.mode = {
		'view': 'restricted',
		'restrictedTo': tag
	};
	
	this.getTodos();
  }

  addNewTodo() {
	this.errors = [];
  
	this.todoService.createTodo({ "title": this.newTodoTitle }).subscribe(data => {
		this.newTodoTitle = '';
		this.getTodos();
	}, err => {
		if (err instanceof ServerValidationErrorEncapsulationModule.ServerValidationError) {
			this.errors.push("Invalid title specified");
		}
	});
  }
  
  moveTodoUp(todo, atIndex) {
	this.updateTodoOrder(todo, todo.order-1);
  }
  
  moveTodoDown(todo, atIndex) {
	this.updateTodoOrder(todo, todo.order+1);
  }
  
  updateTodoOrder(todo, newOrder) {
	todo.order = newOrder;
	this.todoService.updateTodo(todo).subscribe(data => {
		this.getTodos();
	});
  }
  
  getTodos() {
	var restrictToTag = this.mode.view == 'restricted' ? this.mode.restrictedTo : null;
  
	var todosObservable = this.todoService.getTodos(restrictToTag);
	todosObservable.subscribe(todosObs => { this.todos = todosObs });
  }
  
  constructor(private _todoService: TodoService, private _tagService: TagService) {
	 this.todoService = _todoService;
	 this.tagService = _tagService;
	 
     this.getTodos();
	 
	 var tagsObservable = this.tagService.getTags();
	 tagsObservable.subscribe(tagsObs => { this.tags = tagsObs });
  }
  
  getTagsThatCanBeAddedToThisTodo(todo) {
	var tagsForThisTodo = [];
	
	for (let i = 0; i < this.tags.length ; ++i) {
		if (todo.tags.indexOf(this.tags[i]) == -1) {
			tagsForThisTodo.push(this.tags[i]);
		}
	}
	
	return tagsForThisTodo;
  }
  
  setAsCompleted(todo) {
	todo.completed = true;
	this.todoService.updateTodo(todo).subscribe();
  }
  
  saveNewTodoTitle(todo) {
	var todoCopy = JSON.parse(JSON.stringify(todo));
	todoCopy.title = todoCopy.newTitle;
	todo.errors = [];

	this.todoService.updateTodo(todoCopy).subscribe(data => {
		todo.enableTodoTitleEdition = false;
		delete todo.newTitle;
		
		todo.title = todoCopy.title;
	}, err => {
		if (err instanceof ServerValidationErrorEncapsulationModule.ServerValidationError) {
			todo.errors.push("Invalid title specified");
		}
	});
  }
  
  enableTodoTitleEdition(todo) {
	todo.newTitle = todo.title;
	todo.enableTodoTitleEdition = true;
  }
  
  deleteTodo(todo, deleteAtIndex) {
	todo.errors = [];
  
	this.todoService.deleteTodo(todo.id).subscribe(data => {
		this.todos.splice(deleteAtIndex, 1);
	}, err => {
		todo.errors.push("A problem occured while deleting the todo");
	});
  }
  
  addTagToTodo(todo, tagToAdd) {
	todo.errors = [];
	var todoCopy = JSON.parse(JSON.stringify(todo));
	todoCopy.tags.push(tagToAdd);
	
	this.todoService.updateTodo(todoCopy).subscribe(data => {
		todo.tags.push(tagToAdd);
	}, err => {
		todo.errors.push("A problem occured while adding the tag");
	});
  }
  
  removeTagFromTodo(todo, deleteAtIndex) {
	todo.errors = [];
	var todoCopy = JSON.parse(JSON.stringify(todo));
	todoCopy.tags.splice(deleteAtIndex, 1);
	
	this.todoService.updateTodo(todoCopy).subscribe(data => {
		if (this.mode.view == 'restricted' && this.mode.restrictedTo == todo.tags[deleteAtIndex]) {
			this.getTodos();
		}
		
		todo.tags.splice(deleteAtIndex, 1);
	}, err => {
		todo.errors.push("A problem occured while removing the tag");
	});
  }
}
