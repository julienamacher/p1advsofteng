const Hapi = require('hapi');
const Inert = require('inert');
const Vision = require('vision');
const HapiSwagger = require('hapi-swagger');
const Joi = require('joi');
const mysql      = require('mysql');
const async = require("async");

const sqlPool = mysql.createPool({
  host     : 'localhost',
  user     : 'root',
  password : 'root',
  database : 'todomvc',
  connectionLimit : 10
});


var todoResourceSchema = Joi.object({
    title: Joi.string(),
    completed: Joi.boolean(),
    order: Joi.number().integer().min(0),
    tags: Joi.array().items(Joi.string()),
    url: Joi.string()
});

var tagResourceSchema = Joi.object({
	id: Joi.number().integer(),
    name: Joi.string(),
});


var returnIdentifier = Joi.object({
	id: Joi.number().integer(),
});

var todoIdSchema = Joi.number().integer().positive().required().description('The Todo ID');
var tagFriendlyNameSchema = Joi.string().required().description('The Tag Friendly name');

// Returns the todo specified by id
// id : id of the todo (numeric) (optional)
// hasThisTag: friendly name of the tag the todo must have (example: "Work") (optional)
// callback:
//           err: true if an internal error occured, false if the specified todo cannot be found, null if no error
//			 todo: todo structure (only if err is null)
var getTodo = function (id, hasThisTag, callback) {
	
	var params = [];
	var whereCondition = [];
	
	if (id != null) {
		whereCondition.push('t.id=?');
		params.push(id);
	}
	
	if (hasThisTag != null) {
		whereCondition.push('t.id IN (SELECT todo_id FROM todo_tags WHERE tag_id=(SELECT id FROM tag WHERE name=?)');
		params.push(hasThisTag);
	}
	
	var whereConditionStr = whereCondition.join(' AND ');
	
	if (whereConditionStr != '') {
		whereConditionStr = ' WHERE ' + whereConditionStr;
	}

	
	var query = sqlPool.query('SELECT t.id, t.title, t.completed, t.`order`, ta.name FROM todo t \
							   LEFT JOIN todo_tags tar ON t.id=tar.todo_id \
							   LEFT JOIN tag ta ON ta.id=tar.tag_id \
							   ' + whereConditionStr + ' \
							   ORDER BY `order` ASC', params, function (err, results) {
		if (err)
		{
			callback(true);
		}
		else
		{
			if (results.length < 1)
			{
				callback(false);
			}
			else
			{
				var todo = {
					"id": results[0].id,
					"title": results[0].title,
					"completed": results[0].completed > 0,
					"order": results[0].order,
					"tags": [],
					"url": server.info.uri + '/todos/' + results[0].id
				};
				
				for (var i = 0 ; i < results.length ; ++i)
				{
					if (results[i].name) {
						todo.tags.push(results[i].name);
					}
				}

				callback(null, todo);
			}
		}
	});
};

const server = new Hapi.Server();
server.connection({
    host: '127.0.0.1',
    port: 5000,
    routes: {cors: true}
});

const swaggerOptions = {
    info: {
        'title': 'Todo API',
        'version': '1.0',
        'description': 'The TODO API allows the creation, modification and deletion of todos, each having zero, one or more associated tags',
    },
    documentationPath: '/doc',
    tags: [
        {
            description: 'TODO operations',
            name: 'todos'
        }
    ]
}

server.register([
    Inert,
    Vision,
    {
        register: HapiSwagger,
        options: swaggerOptions
    }
]);

server.route({
    method: 'GET',
    path: '/todos/',
    handler: function (request, reply) {

		async.waterfall([
			function(callback) {
				// Restrict to a specific tag friendly name (such as "Work") ?
				if (request.query && request.query.tag) {
					sqlPool.query("SELECT id FROM tag WHERE name=?", request.query.tag, function (err, results) {
						if (err) {
							callback(err, false, true);
						} else {
							// The specified tag to restrict to is missing
							if (results.length < 1) {
								callback(true, true, false);
							} else {
								callback(null, results[0].id);
							}
						}
					});
				} else {
					callback(null, null);
				}
			},
			// idOfTheTagToRestrictTo = id of the tag to restrict to, or null to not restrict to a single tag
			function(idOfTheTagToRestrictTo, callback) {
				
				var restrictToASpecificTag = "";
				var params = [];
				
				if (idOfTheTagToRestrictTo != null) {
					restrictToASpecificTag = " WHERE t.id IN (SELECT todo_id FROM todo_tags WHERE tag_id=?)";
					params.push(idOfTheTagToRestrictTo);
				}
				
				sqlPool.query("SELECT t.id, t.title, t.completed, t.`order`, ta.name  \
							   FROM todo t LEFT JOIN todo_tags tar ON t.id=tar.todo_id \
							   LEFT JOIN tag ta ON ta.id=tar.tag_id \
							   " + restrictToASpecificTag + " \
							   ORDER BY `order` ASC", 
							   params,
							   function (err, results) {
								   
								   
					if (err)
					{
						callback(true, false, true);
					}
					else
					{
						var todos = [];
						var currentToDoId = null;
						var todo = null;
						var added;
						
						for (var i = 0 ; i < results.length ; ++i)
						{
							added = false;
							currentToDoId = results[i].id;
							todo = {
								"id": results[i].id,
								"title": results[i].title,
								"completed": results[i].completed > 0,
								"order": results[i].order,
								"tags": [],
								"url": server.info.uri + '/todos/' + results[i].id
							};
							
							for (; i < results.length ; ++i)
							{
								// Not a new todo: only a new tag
								if (currentToDoId != results[i].id)
								{
									todos.push(todo);
									currentToDoId = results[i].id;
									added = true;
									--i;
									break;
								}
								
								if (results[i].name) {
									todo.tags.push(results[i].name);
								}
							}
						}
						
						// Last todo only had zero or one tag
						if (!added && todo != null) {
							todos.push(todo);
						}
						
						callback(null, false, false, todos);
					}
				});
				
			}
		], function (err, invalidTagSpecified, internalError, todos) {
			if (err) {
				reply().code(invalidTagSpecified ? 400 : 500);
			} else {
				reply(todos).code(200);
			}
		});
    },
    config: {
        tags: ['api'],
        description: 'List all todos. Specify a friendly name in the tag query parameter to restrict to it (example: ?tag=Work)',
        plugins: {'hapi-swagger': {responses: {
            200: {
                description: 'Success',
                schema: Joi.array().items(
                    todoResourceSchema.label('Result')
                ),
				query: {
					tag: Joi.string().optional()
				}
            },
			500: {
				 description: 'Internal server error'
			}
        }}}
    }
});

server.route({
    method: 'GET',
    path: '/tags/',
    handler: function (request, reply) {
		sqlPool.query('SELECT name FROM tag ORDER BY name ASC', function (err, results) {
			if (err) {
				reply().code(500);
			}
			else
			{
				var tags = [];
				
				// Tags are returned in an array such as ["Work", "Homework"]
				for (var i = 0; i < results.length; ++i) {
					tags.push(results[i].name);
				}
				
				reply(tags).code(200);
			}
		});
    },
    config: {
        tags: ['api'],
        description: 'List all tags',
        plugins: {'hapi-swagger': {responses: {
            200: {
                description: 'Success',
                schema: Joi.array().items(
                    Joi.string()
                )
            },
			500: {
				 description: 'Internal server error'
			}
        }}}
    }
});

server.route({
    method: 'DELETE',
    path: '/todos/',
    handler: function (request, reply) {
        
		async.waterfall([
			function(callback) {
				sqlPool.getConnection(function(err, sqlConnection) {
					callback(err, sqlConnection);
				});
			},
			function(sqlConnection, callback) {
				sqlConnection.query('START TRANSACTION', function (err) {
					callback(err, sqlConnection);
				});
			},
			// Deleting relationships between todos and tags
			function(sqlConnection, callback) {
				sqlConnection.query('DELETE FROM todo_tags', function (err, results) {
					callback(err, sqlConnection);
				});
			},
			// Deleting all todos
			function(sqlConnection, callback) {
				sqlConnection.query('DELETE FROM todo', function (err) {
					callback(err, sqlConnection);
				});
			}
		], function (err, sqlConnection) {
			sqlConnection.query(err ? 'ROLLBACK' : 'COMMIT', function (err) {
				
				if (sqlConnection) {
					sqlConnection.release();
				}
				
				reply().code(err ? 500 : 200);
			});
		});

    },
    config: {
        tags: ['api'],
        description: 'Delete all todos',
        plugins: {'hapi-swagger': {responses: {
            204: {description: 'Todos deleted'},
            204: {description: 'Internal server error'}
        }}}
    }
});

server.route({
    method: 'DELETE',
    path: '/tags/',
    handler: function (request, reply) {
		async.waterfall([
			function(callback) {
				sqlPool.getConnection(function(err, sqlConnection) {
					callback(err, sqlConnection);
				});
			},
			function(sqlConnection, callback) {
				sqlConnection.query('START TRANSACTION', function (err) {
					callback(err, sqlConnection);
				});
			},
			function(sqlConnection, callback) {
				sqlConnection.query('DELETE FROM todo_tags', function (err, results) {
					callback(err, sqlConnection);
				});
			},
			function(sqlConnection, callback) {
				sqlConnection.query('DELETE FROM tag', function (err) {
					callback(err, sqlConnection);
				});
			}
		], function (err, sqlConnection) {
			if (!sqlConnection) {
				reply().code(500);
			} else {
				sqlConnection.query(err ? 'ROLLBACK' : 'COMMIT', function (err) {
					sqlConnection.release();
					reply().code(err ? 500 : 200);
				});
			}
		});
    },
    config: {
        tags: ['api'],
        description: 'Delete all tags',
        plugins: {'hapi-swagger': {responses: {
            204: {description: 'Todos deleted'},
            204: {description: 'Internal server error'}
        }}}
    }
});

server.route({
    method: 'POST',
    path: '/todos/',
    handler: function (request, reply) {
		
		var order = null;
		
		if (request.payload.order) {
			order = request.payload.order;
		}
		
		async.waterfall([
			function(callback) {
				sqlPool.getConnection(function(err, sqlConnection) {
					callback(err, sqlConnection);
				});
			},
			function(sqlConnection, callback) {	
				sqlConnection.query('START TRANSACTION', function (err) {
					callback(err, sqlConnection);
				});
			},
			// Making space in the continuous order numbering for the new entry
			function(sqlConnection, callback) {
				if (order != null) {
					sqlConnection.query('UPDATE todo SET `order`=`order`+1 WHERE `order`>?', [order], function (err, results) {								   
						callback(err, sqlConnection);
					});
				} else {
					callback(null, sqlConnection);
				}
			},
			// Retrieving the maximal order value to make sure the request doesn't specify an order value greater than that
			function(sqlConnection, callback) {
					sqlConnection.query('SELECT MAX(`order`)+1 AS nextOrderValue FROM todo', function (err, results) {	
						var nextOrderValue = results[0].nextOrderValue;
						
						// if no rows in todo, NULL is returned
						if (nextOrderValue == null) {
							nextOrderValue = 0;
						}
						
						if (order != null && nextOrderValue > order) {
							callback(true, sqlConnection, null, null, orderValueSpecifiedOutOfBounds);
						} else {
							callback(err, sqlConnection, nextOrderValue);
						}
					});
			},
			function(sqlConnection, nextOrderValue, callback) {
				var params = [request.payload.title,
							  request.payload.completed || 0];

				// If the user specifies an order, the todo will have this order. Otherwise we set it as the last order + 1
				params.push(order == null ? nextOrderValue : order);

				sqlConnection.query('INSERT INTO todo(title, completed, `order`) VALUES(?, ?, ?)', params, function (err, results) {	
					callback(err, sqlConnection, err ? null : results.insertId);
				});
			},
			function(sqlConnection, generatedToDoId, callback) {
				// Adding the tags relationship with the new todo, if required
				if (request.payload.hasOwnProperty('tags') && request.payload.tags.length != 0) {
					async.eachSeries(request.payload.tags, function(tagToInsert, eachTagCallback){
						sqlConnection.query('INSERT INTO todo_tags(todo_id, tag_id) VALUES(?, (SELECT id FROM tag WHERE name=?))', [generatedToDoId, tagToInsert], function (err) {
								eachTagCallback(err);
						});
					},
					function done(errEachTagCallback){
						callback(errEachTagCallback, sqlConnection, generatedToDoId, errEachTagCallback && errEachTagCallback.code == 'ER_BAD_NULL_ERROR');
					});
				}
				else
				{
					callback(null, sqlConnection, generatedToDoId, false);
				}
			}
		], function (err, sqlConnection, generatedToDoId, userSpecifiedAnInvalidTag, orderValueSpecifiedOutOfBounds) {
			sqlConnection.query(err ? 'ROLLBACK' : 'COMMIT', function (errRollback) {
				
				if (sqlConnection) {
					sqlConnection.release();
				}
				
				reply(generatedToDoId == null ? null : { 'id': generatedToDoId }).code(userSpecifiedAnInvalidTag || orderValueSpecifiedOutOfBounds ? 400 : (err || errRollback ? 500 : 201));
			});
		});
    },
    config: {
        tags: ['api'],
        description: 'Create a todo',
        validate: {
            payload: {
                title: Joi.string().required().min(1).max(255),
                order: Joi.number().integer().min(0),
                tags: Joi.array().items(Joi.string()),
                completed: Joi.boolean()
            }
        },
        plugins: {'hapi-swagger': {responses: {
            201: {
                description: 'Created',
                schema: returnIdentifier.label('Result')
            },
			400: {
                description: 'Invalid tags'
            },
			500: {
                description: 'Internal server error'
            }
        }}}
    }
});

server.route({
    method: 'POST',
    path: '/tags/',
    handler: function (request, reply) {
		sqlPool.query('INSERT INTO tag(name) VALUES(?)', [request.payload.name], function (err, results) {

			if (!err) {
				var tag = {
					'id': results.insertId,
					'name': request.payload.name
				};

				reply(tag).code(201);
			}
			else {
				reply().code(err && err.code == 'ER_DUP_ENTRY' ? 400 : 500);
			}
		});
    },
    config: {
        tags: ['api'],
        description: 'Create a tag',
        validate: {
            payload: {
                name: Joi.string().min(1).max(80).required()
            }
        },
        plugins: {'hapi-swagger': {responses: {
            201: {
                description: 'Created',
                schema: tagResourceSchema.label('Result')
            },
			400: {
                description: 'Duplicate tag name'
            },
			500: {
                description: 'Internal server error'
            }
        }}}
    }
});

server.route({
    method: 'GET',
    path: '/todos/{todo_id}',
    handler: function (request, reply) {
        getTodo(request.params.todo_id, null, function(err, toDo) {
			if (err == true) {
				reply().code(500);
			} else if (err == false) {
				reply().code(404);
			} else {
				reply(toDo).code(200);
			}
		});
    },
    config: {
        tags: ['api'],
        description: 'Fetch a given todo',
        validate: {
            params: {
                todo_id: todoIdSchema
            }
        },
        plugins: {'hapi-swagger': {responses: {
            200: {
                description: 'Success',
                schema: todoResourceSchema.label('Result')
            },
            404: {description: 'Todo not found'}
        }}}
    }
});

server.route({
    method: 'GET',
    path: '/tags/{tag_id}',
    handler: function (request, reply) {
		// Returning all todos having this tag
		getTod(null, request.params.tag_id, function(err, tag) {
			if (err) {
				reply().code(404);
			} else {
				reply(tag).code(200);
			}
		});
    },
    config: {
        tags: ['api'],
        description: 'Fetch a given todo',
        validate: {
            params: {
                todo_id: todoIdSchema
            }
        },
        plugins: {'hapi-swagger': {responses: {
            200: {
                description: 'Success',
                schema: todoResourceSchema.label('Result')
            },
            404: {description: 'Todo not found'}
        }}}
    }
});

server.route({
    method: 'PATCH',
    path: '/todos/{todo_id}',
    handler: function (request, reply) {
        todoId = request.params.todo_id;
		
		var params = '';
		var paramsValues = [];
		var currentOrder = null;
		var order = null;
		
		// Do we need to update the title ?
		if (request.payload.hasOwnProperty('title')) {
			params += " title=? ";
			paramsValues.push(request.payload.title);
		}
		
		// Do we need to update the completed tag ?
		if (request.payload.hasOwnProperty('completed')) {
			params += (params == "" ? "" : ",") + " completed=? ";
			paramsValues.push(request.payload.completed ? 1 : 0);
		}
		
		// Do we need to update the order ?
		if (request.payload.hasOwnProperty('order')) {
			params += (params == "" ? "" : ",") + " `order`=? ";
			order = request.payload.order;
			paramsValues.push(request.payload.order);
		}
		
		// If we don't have to update anything => error
		if (params == "" && !request.payload.hasOwnProperty('tags')) {
			reply().code(400);
		} else {
			var updateOrder;
			
			async.waterfall([
				function(callback) {
					sqlPool.getConnection(function(err, sqlConnection) {
						callback(err, sqlConnection);
					});
				},
				function(sqlConnection, callback) {
					sqlConnection.query('START TRANSACTION', function (err) {
						callback(err, sqlConnection);
					});
				},
				// Retrieving the todo record we want to update
				function(sqlConnection, callback) {
					sqlConnection.query('SELECT `order` FROM todo WHERE id=?', [todoId], function (err, results) {			
						if (err) {
							callback(err, sqlConnection, false);
						} else if (results.length < 1) {
							callback(true, sqlConnection, true);
						} else {
							currentOrder = results[0].order;
							updateOrder = currentOrder != order;
							callback(null, sqlConnection);
						}
					});
				},
				// Setting the actual order value of the value of the actual order record value we want to update
				function(sqlConnection, callback) {
					if (!updateOrder) {
						callback(null, sqlConnection);
					} else {
						sqlConnection.query('UPDATE todo SET `order`=? WHERE `order`=?', [currentOrder, order], function (err, results) {
							callback(err, sqlConnection);
						});
					}
				},
				// Updating the todo record
				function(sqlConnection, callback) {
					paramsValues.push(todoId);
					sqlConnection.query('UPDATE todo SET ' + params + ' WHERE id=?', paramsValues, function (err, results) {
						callback(err, sqlConnection, results.affectedRows < 1);
					});
				},
				// Deleting all tags linked to this todo
				function(sqlConnection, userSpecifiedAnInvalidTag, callback) {
					if (request.payload.hasOwnProperty('tags')) {
						sqlConnection.query('DELETE FROM todo_tags WHERE todo_id=?', [todoId], function (err) {
							callback(err, sqlConnection, userSpecifiedAnInvalidTag);
						});
					}
					else
					{
						callback(err, sqlConnection, userSpecifiedAnInvalidTag);
					}
				},
				// Adding all the specified tags to the todo
				function(sqlConnection, userSpecifiedAnInvalidTag, callback) {
					if (request.payload.hasOwnProperty('tags') && request.payload.tags.length != 0) {
						async.eachSeries(request.payload.tags, function(tagToInsert, eachTagCallback){
							sqlConnection.query('INSERT INTO todo_tags(todo_id, tag_id) VALUES(?, (SELECT id FROM tag WHERE name=?))', [todoId, tagToInsert], function (err) {
									eachTagCallback(err, err && err.code == 'ER_BAD_NULL_ERROR');
							});
						},
						function done(errEachTagCallback, errIsInvalidTagSpecified){
							callback(errEachTagCallback, sqlConnection, errIsInvalidTagSpecified);
						});
					}
					else
					{
						callback(null, sqlConnection, false);
					}
				}
			], function (err, sqlConnection, userSpecifiedAnInvalidTag) {
				sqlConnection.query(err ? 'ROLLBACK' : 'COMMIT', function (commitRollbackErr) {
					
					if (sqlConnection) {
						sqlConnection.release();
					}
					
					if (!userSpecifiedAnInvalidTag && !err && !commitRollbackErr) {
						reply().code(200);
					} else {
						reply().code(userSpecifiedAnInvalidTag ? 404 : 500);
					}
				});
			});
		}
    },
    config: {
        tags: ['api'],
        description: 'Update a given todo',
        validate: {
            params: {
                todo_id: todoIdSchema
            },
            payload: {
                title: Joi.string().min(1).max(255),
                completed: Joi.boolean(),
                order: Joi.number().integer().min(0),
                tags: Joi.array().items(Joi.string())
            }
        },
        plugins: {'hapi-swagger': {responses: {
            200: { description: 'Success' },
            404: {description: 'Todo not found'},
            500: {description: 'Internal server error'}
        }}}
    }
});

server.route({
    method: 'PATCH',
    path: '/tags/{tag_friendly_name}',
    handler: function (request, reply) {
		if (!request.params.tag_friendly_name) {
			reply().code(400);
		} else {
			sqlPool.query('UPDATE tag set name=? \
						   WHERE name=?', [request.payload.name, request.params.tag_friendly_name], function (err, results) {
				reply().code(!err && results.affectedRows < 1 ? 404 : (err && err.code == 'ER_DUP_ENTRY' ? 400 : (err ? 500 : 200)));
			});
		}
    },
    config: {
        tags: ['api'],
        description: 'Update a given tag',
        validate: {
            params: {
                tag_friendly_name: tagFriendlyNameSchema
            },
            payload: {
                name: Joi.string().min(1).max(80).required()
            }
        },
        plugins: {'hapi-swagger': {responses: {
            200: {
                description: 'Success'
            },
            400: {description: 'Duplicate tag name'},
            404: {description: 'Tag not found'},
            500: {description: 'Internal server error'}
        }}}
    }
});

server.route({
    method: 'DELETE',
    path: '/todos/{todo_id}',
    handler: function (request, reply) {
		var toDoIdToDelete = request.params.todo_id;

		async.waterfall([
			function(callback) {
				sqlPool.getConnection(function(err, sqlConnection) {
					callback(err, sqlConnection);
				});
			},
			function(sqlConnection, callback) {
				sqlConnection.query('START TRANSACTION', function (err) {
					callback(err, sqlConnection);
				});
			},
			function(sqlConnection, callback) {
				sqlConnection.query('SELECT `order` \
									 FROM todo \
									 WHERE id=?', [toDoIdToDelete], function (err, results) {
					if (results.length == 1) {
						var orderOfTodoToDelete = results[0].order;
						
						callback(err, sqlConnection, false, orderOfTodoToDelete);
					} else {
						callback(true, sqlConnection, true, null);
					}
				});
			},
			// Decrementing the todos having an order value greater than the one we are deleting
			function(sqlConnection, userSpecifiedAnInvalidTodo, orderOfTodoToDelete, callback) {
				sqlConnection.query('UPDATE todo SET `order`=`order`-1 WHERE `order`>?', [orderOfTodoToDelete], function (err, results) {
					callback(err, sqlConnection);
				});
			},
			// Deleting all tags linked to the specified todo
			function(sqlConnection, callback) {
				sqlConnection.query('DELETE FROM todo_tags WHERE todo_id=?', [toDoIdToDelete], function (err) {
					callback(err, sqlConnection);
				});
			},
			// Deleting the specified todo itself
			function(sqlConnection, callback) {
				sqlConnection.query('DELETE FROM todo WHERE id=?', [toDoIdToDelete], function (err, results) {
					callback(err, sqlConnection, results.affectedRows < 1);
				});
			}
		], function (err, sqlConnection, userSpecifiedAnInvalidTodo) {
			sqlConnection.query(err ? 'ROLLBACK' : 'COMMIT', function (errRollback) {
				
				if (sqlConnection)
					sqlConnection.release();
				
				reply().code(userSpecifiedAnInvalidTodo ? 404 : ((err || errRollback) ? 500 : 200));
			});
		});
    },
    config: {
        tags: ['api'],
        description: 'Delete a given todo',
        validate: {
            params: {
                todo_id: todoIdSchema
            }
        },
        plugins: {'hapi-swagger': {responses: {
            204: {description: 'Todo deleted'},
            404: {description: 'Todo not found'},
            500: {description: 'Internal server error'}
        }}}
    }
});

server.route({
    method: 'DELETE',
    path: '/tags/{tag_id}',
    handler: function (request, reply) {
		var tagIdToDelete = request.params.tag_id;

		async.waterfall([
			function(callback) {
				sqlPool.getConnection(function(err, sqlConnection) {
					callback(err, sqlConnection);
				});
			},
			function(sqlConnection, callback) {
				sqlConnection.query('START TRANSACTION', function (err) {
					callback(err, sqlConnection);
				});
			},
			// Deleting relationships with the tags
			// If the tag does not exist, the next cascade will catch it
			function(sqlConnection, callback) {
				sqlConnection.query('DELETE FROM todo_tags \
									 WHERE tag_id=(SELECT id FROM tag WHERE name=?)', [tagIdToDelete], function (err) {
					callback(err, sqlConnection);
				});
			},
			// Deleting the specified tag itself
			function(sqlConnection, callback) {
				sqlConnection.query('DELETE FROM tag \
									 WHERE name=?', [tagIdToDelete], function (err, results) {
					callback(err, sqlConnection, results.affectedRows < 1);
				});
			}
		], function (err, sqlConnection, userSpecifiedAnInvalidTag) {
			sqlConnection.query(err ? 'ROLLBACK' : 'COMMIT', function (err) {
				
				if (sqlConnection)
					sqlConnection.release();
				
				reply().code(userSpecifiedAnInvalidTag ? 404 : (err ? 500 : 200));
			});
		});
    },
    config: {
        tags: ['api'],
        description: 'Delete a given tag. Todos having the specified tag will see it removed',
        validate: {
            params: {
                tag_id: Joi.string().required()
            }
        },
        plugins: {'hapi-swagger': {responses: {
            204: {description: 'Tag deleted'},
            404: {description: 'Tag not found'},
            500: {description: 'Internal server error'}
        }}}
    }
});

server.start((err) => {
    console.log('Server running at:', server.info.uri);
	
	// Testing the SQL connection at startup
	sqlPool.query('SELECT 1+1 AS result', function (err, results) {
		if (err) {
			console.log('ERROR: SQL connection cannot be established ' + err);
		} else {
			console.log('SQL connection is working');
		}
	});
});
