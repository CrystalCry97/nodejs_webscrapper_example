const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ArticleSchema = new Schema({
	title: {type:String, trim:true, required:true,minlength:10},
	link: {type:String,required:true,unique:true},
	abstract: {type:String, required:true},
	category: {type:String, },
	year: {type:String},
  isDeleted: {type:Boolean, default:false},
},{timestamps:true});

module.exports = ArticleSchema; 
