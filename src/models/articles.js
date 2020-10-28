const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ArticleSchema = new Schema({
	title: {type:String, trim:true, required:true,minlength:5},
	link: {type:String,required:true,unique:true},
	abstract: {type:String, required:true},
	category: {type:String, },
	year: {type:String},
},{timestamps:true});

module.exports = ArticleSchema; 
