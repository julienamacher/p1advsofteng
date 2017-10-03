import { Component } from '@angular/core';

import { TagService } from "app/services/tag.service";
import { ServerValidationErrorEncapsulationModule } from "./ServerValidationError";

@Component({
  selector: 'tags-root',
  templateUrl: './tags.component.html',
  styleUrls: ['./tags.component.css']
})
export class TagsComponent {
  errors: string[];
  tags = [];
  tagService;
  newTagName = "";
  
  addNewTagName() {
	this.errors = [];
  
	this.tagService.createTag(this.newTagName).subscribe(data => {
		this.newTagName = '';
		this.getTags();
	}, err => {
		if (err.status == 400 || err instanceof ServerValidationErrorEncapsulationModule.ServerValidationError) {
			this.errors.push("Invalid name specified");
		} else {
			this.errors.push("An error occured");
		}
	});
  }
  
  constructor(private _tagService: TagService) {
	 this.tagService = _tagService;
	 this.getTags();
  }
  
  getTags() {
	 var tagsObservable = this.tagService.getTags();
	 tagsObservable.subscribe(tagsObs => {
		var tagsTemp = [];
	 
		for (let i = 0; i != tagsObs.length; i++) {
			tagsTemp.push({
				"name": tagsObs[i]
			});
		 }
		 
		 this.tags = tagsTemp;
	}, err => {
		this.errors.push("An error occured");
	});
  }
  
  deleteTag(tag, deleteAtIndex) {
	tag.errors = [];
  
	this.tagService.deleteTag(tag.name).subscribe(data => {
		this.tags.splice(deleteAtIndex, 1);
		tag.enableTagNameEdition = false;
	}, err => {
		tag.errors.push("A problem occured while removing the tag");
	});
  }
  
  enableTagNameEdition(tag) {
	tag.originalName = tag.name;
	tag.newName = tag.name;
	tag.enableTagNameEdition = true;
  }
  
  saveNewTagName(tag) {
	tag.errors = [];
  
	this.tagService.renameTag(tag.originalName, tag.newName).subscribe(data => {
		tag.name = tag.newName;
		
		delete tag.originalName;
		delete tag.newName;
		tag.enableTagNameEdition = false;
		
		this.getTags();
	}, err => {
		if (err.status == 400 || err instanceof ServerValidationErrorEncapsulationModule.ServerValidationError) {
			tag.errors.push("Invalid name specified");
		} else {
			tag.errors.push("An error occured");
		}
	});
  }
}
