/************\HEADER/*************
* AUTHORS: - Hall Axel           *
*          - Michel Lucas        *
* SCIPERS: - 346228              *
*          - 363073              *
* VERSION: 2.0                   *
* FILE: extension.js             *
*********************************/

const vscode = require('vscode');
const headerData = require("./header.json");
const path = require('path');
const fs = require('fs');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	vscode.window.showInformationMessage("SHG is activated.");
	let disposable = vscode.commands.registerCommand('SHG.generate_header', generateHeader);
	context.subscriptions.push(disposable);
	

	disposable = vscode.commands.registerCommand('SHG.generate_save_header', GenerateAndSaveHeader);
	context.subscriptions.push(disposable);

	context.subscriptions.push(vscode.commands.registerCommand('SHG.openHeaderConfig', openHeaderConfig));
}

function openHeaderConfig(){
	var parentDir = path.dirname(__filename);
    //const configPath = vscode.workspace.getConfiguration().get('headerConfigPath');
	//const packagePath = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'header.json');
    //const fullPath = path.join(vscode.workspace.rootPath|| '', configPath || '');
	vscode.window.showInformationMessage(parentDir);
	
    vscode.workspace.openTextDocument(parentDir+"/header.json").then(doc => {
        vscode.window.showTextDocument(doc);
    }, err => {
        vscode.window.showErrorMessage(`Error opening Header Configuration File: ${err}`);
    });

}
function wait(time) {
	return new Promise(resolve => setTimeout(resolve, time));
}

async function GenerateAndSaveHeader(){
	if (vscode.window.activeTextEditor.document.fileName.split('.').pop() != 'json'){
		generateHeader();
		await wait(100);
	}
	
	await vscode.window.activeTextEditor.document.save();
	if (path.basename(vscode.window.activeTextEditor.document.fileName) == 'header.json')
	{
		vscode.commands.executeCommand('workbench.action.reloadWindow');
		vscode.window.showInformationMessage("Reload");
	}
}

function findHeaderRange() {
	const editor = vscode.window.activeTextEditor;
	
	const document = editor.document;
	const firstLine = document.lineAt(0);
	
	if (firstLine.isEmptyOrWhitespace) {
	  return null;
	}
	
	const lineCount = document.lineCount;
	var startLine = 0;
	var endLine = -1;
	var endCol = -1;
	var text = firstLine.text.trim();
	if (text.includes(headerData.HeaderMarker)){
		endLine++;
		for (let i = 0; i < lineCount; i++) {
			const line = document.lineAt(i);
			text = line.text.trim();
			if (text[0] == '*' || text[0] == '/') {
				endLine ++;
				endCol = text.length;
				if (text[text.length-1] == '/'){
					break;
				}
			} 
			else{
				break;
			}
		  }
	}
	else{
		return null;
	}
	
	
	if (startLine !== -1 && endLine !== -1) {
		return new vscode.Range(0, 0, endLine-1, endCol);
	}
	
	return null;
  }

function checkHeaderJson(){
	for (const prop in headerData) {
		const value = headerData[prop];
		if (prop == "ShowFileName" || prop == "ShowModifiedDate" || prop == "ShowCreatedDate"){
			continue;
		}
		if (value.constructor.name != "Array" && value.constructor.name != "String"){
			vscode.window.showInformationMessage('Error : header.json - values can only be of type <string> or <array> !');
			return false;
		}
		if (value.constructor.name == "Array")
		{
			value.forEach(element => {
				if (element.constructor.name != "String"){
					vscode.window.showInformationMessage('Error : header.json - at least one element of the array inside of' + prop + 'is not of type <string>');
					return false;
				}
			});
		}
	}
	return true;
}
//GENERATE HEADER
function generateHeader() {
	var show_file_name;
	var show_created_date;
	var show_modified_date;
	const editor = vscode.window.activeTextEditor;
	const filePath = editor.document.uri.fsPath;
  	const fileName = path.basename(filePath);
	const creationDate = fs.statSync(filePath).birthtime.toLocaleString();
	
	if (!editor){
		vscode.window.showInformationMessage('No active text editor.');
		return;
	}
	if(!checkHeaderJson()){
		return;
	}

	const headerLines = [];
	for (const prop in headerData) {
		if (Object.prototype.hasOwnProperty.call(headerData, prop)) {
			const value = headerData[prop];
			if (prop == "ShowFileName" ){
				show_file_name = value;
				continue;
			}
			if (prop == "ShowModifiedDate"){
				show_modified_date = value;
				continue;
			}
			if (prop == "ShowCreatedDate"){
				show_created_date = value;
				continue;
			}
			if (prop == "HeaderMarker"){
				continue;
			}
			if (value.constructor.name == "Array"){
				var formattedValue = prop.toUpperCase() + ': ';
				for (const el in value){
					if (el == '0'){
						formattedValue += "- " + value[el];
						headerLines.push(formattedValue);
					}
					else{
						formattedValue = " ".repeat(prop.length+2) + "- " + value[el];
						headerLines.push(formattedValue);
					}
				}
			}
			else{
				const formattedValue = prop.toUpperCase() + ': ' + value;
				headerLines.push(formattedValue);
			}
			
		}
	}
	if (show_created_date == true){
		const formattedValue = "CREATED: " + creationDate;
		headerLines.push(formattedValue);

	}
	if (show_modified_date == true){
		const formattedValue = "MODIFIED: " + new Date().toLocaleString();
		headerLines.push(formattedValue);

	}
	if (show_file_name == true){
		const formattedValue = "FILE: " + fileName;
		headerLines.push(formattedValue);

	}

	const maxLength = Math.max(...headerLines.map(line => line.length));
	const topBorder = '/' + '*'.repeat(maxLength/2 + 1) + headerData.HeaderMarker + '*'.repeat(maxLength/2 + 2);
	const bottomBorder = '*'.repeat(maxLength/2 + 2) + '*'.repeat(8) + '*'.repeat(maxLength/2 + 1) + '/';

	const header = [topBorder];
	headerLines.forEach((line) => {
		const padding = ' '.repeat(maxLength - line.length + 7);
		const formattedLine = `* ${line}${padding} *`;
		header.push(formattedLine);
	});
	header.push(bottomBorder);
	const headerText = header.join('\n');
	let edit;

	if(findHeaderRange() == null)
		edit = new vscode.TextEdit(new vscode.Range(0, 0, 0, 0), headerText+'\n\n');
	else
		edit = new vscode.TextEdit(findHeaderRange(), headerText);

	const workspaceEdit = new vscode.WorkspaceEdit();
  	workspaceEdit.set(editor.document.uri, [edit]);
  	vscode.workspace.applyEdit(workspaceEdit);
	
	
}

function deactivate() {
	vscode.window.showInformationMessage("SHG is deactivated.");
}

module.exports = {
	activate,
	deactivate
}
