const request = require('supertest');
const mocha = require('mocha');
const assert = require('assert');

const describe = mocha.describe;

var baseUrl = 'http://127.0.0.1:5000';

var idFirstTodo;

describe('Basic', function() {
  it('Should delete all tags on DELETE /tags/', function(done) {
    request(baseUrl)
      .delete('/tags/')
	  .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
  });
  
  it('Should delete all todos on DELETE /todos/', function(done) {
    request(baseUrl)
      .delete('/todos/')
	  .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
  });
  
  // Creating two tags "Work" and "Homework"
  
  it('Should create a new tag "Work" on POST /tags/', function(done) {
    request(baseUrl)
      .post('/tags/')
	  .expect(201)
	  .send({
        'name': 'Work'
      })
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
  });
  
  it('Should create a new tag "Homework" on POST /tags/', function(done) {
    request(baseUrl)
      .post('/tags/')
	  .expect(201)
	  .send({
        'name': 'Homework'
      })
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
  });
  
  it('Should return the two created tags on GET /tags/', function(done) {
    request(baseUrl)
      .get('/tags/')
	  .expect(200)
      .end(function(err, result) {
        if (err) return done(err);
		
		// result must be: [ 'Homework', 'Work' ]
		
		assert.equal(result.body.length, 2);
		assert.notEqual(result.body.indexOf('Work'), -1);
		assert.notEqual(result.body.indexOf('Homework'), -1);
		
        done();
      });
  });
  
  it('Should create a new todo #1 on POST /todos/', function(done) {
    request(baseUrl)
      .post('/todos/')
	  .expect(201)
	  .send({
        'title': 'Automated todo 1',
		'tags': ['Work']
      })
      .end(function(err, res) {
        if (err) return done(err);
		
		idFirstTodo = res.body.id;
		
        done();
      });
  });
  
  it('Should return the created todo on GET /todos/', function(done) {
    request(baseUrl)
      .get('/todos/')
	  .expect(200)
	  .end(function(err, result) {
		if (err) return done(err);
		
        assert.equal(result.body.length, 1);
        assert.equal(result.body[0].title, 'Automated todo 1');
        assert.equal(result.body[0].tags.length, 1);
        assert.equal(result.body[0].tags[0], 'Work');
		
        done();
	   });
  });
  
  // Then, the tag "Work" is modified to "Important"
  
  it('Should modify the created tag "Work" to "Important" on PATCH /tags/Work', function(done) {
    request(baseUrl)
      .patch('/tags/Work')
	  .send({
        'name': 'Important'
      })
	  .expect(200)
	  .end(function(err, result) {
		if (err) return done(err);
        done();
	   });
  });
  
  it('Should return the two tags ("Work" and "Important") on GET /tags/', function(done) {
    request(baseUrl)
      .get('/tags/')
	  .expect(200)
      .end(function(err, result) {
        if (err) return done(err);
		
		// result must be: [ 'Homework', 'Important' ]

		assert.equal(result.body.length, 2);
		assert.notEqual(result.body.indexOf('Important'), -1);
		assert.notEqual(result.body.indexOf('Homework'), -1);
		
        done();
      });
  });
  
  // Creating a new todo #2. This should fail because we specify the old tag "Work"
  
  it('Should create a new todo #2 on POST /todos/', function(done) {
    request(baseUrl)
      .post('/todos/')
	  .expect(400)
	  .send({
        'title': 'Automated todo 2',
		'tags': ['Work']
      })
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
  });
  
  // Creating a new todo #3. This should succeed
  
  it('Should create a new todo #2 on POST /todos/', function(done) {
    request(baseUrl)
      .post('/todos/')
	  .expect(201)
	  .send({
        'title': 'Automated todo 2',
		'tags': ['Homework']
      })
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
  });
  
  // Modifying the first todo
  
  it('Update the first todo on PATCH /todos/', function(done) {
    request(baseUrl)
      .patch('/todos/' + idFirstTodo)
	  .expect(200)
	  .send({
        'title': 'New automated todo 1',
		'tags': ['Important', 'Homework']
      })
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
  });
  
  // All todos should be returned on GET /todos/
  
  it('Should return the 2 todos on GET /todos/', function(done) {
    request(baseUrl)
      .get('/todos/')
	  .expect(200)
	  .end(function(err, result) {
		if (err) return done(err);
		
		console.log(result.body);
		
        assert.equal(result.body.length, 2);
		
		var indexFirst = result.body[0].title == 'New automated todo 1' ? 0 : 1;
		var indexSecond = indexFirst == 0 ? 1 : 0;
		
		// Important and Homework tags only
        assert.equal(result.body[indexFirst].title, 'New automated todo 1');
        assert.equal(result.body[indexFirst].tags.length, 2);
		assert.notEqual(result.body[indexFirst].tags.indexOf('Important'), -1);
		assert.notEqual(result.body[indexFirst].tags.indexOf('Homework'), -1);
		
		// Homework tag only
		assert.equal(result.body[indexSecond].title, 'Automated todo 2');
        assert.equal(result.body[indexSecond].tags.length, 1);
		assert.notEqual(result.body[indexSecond].tags.indexOf('Homework'), -1);
		
        done();
	   });
  });
});
