import * as THREE from './Synchronizer/three/three.module.js';

import { GUI } from './Synchronizer/three/libs/lil-gui.module.min.js';
import Stats from './Synchronizer/three/libs/stats.module.js';

import { OrbitControls } from './Synchronizer/three/controls/OrbitControls.js';


import SceneInterface from './Synchronizer/SceneInterface.js';
import SceneDescriptor from './Synchronizer/SceneDescriptor.js';
import SceneController from './Synchronizer/SceneController.js';
import SceneSynchronizer from './Synchronizer/SceneSynchronizer.js';


import CommandTypes from './Synchronizer/CommandTypes.js';
import ClientMessageHandler from './ClientMessageHandler.js';

console.log(CommandTypes.NEW_PLAYER)

const sceneInterface = new SceneInterface();
const sceneDescriptor = new SceneDescriptor();

const gltf = await sceneInterface.loadFile(`./scene.gltf`);
sceneDescriptor.loadGLTF(gltf.parser.json);

const sceneSynchronizer = new SceneSynchronizer(sceneInterface, sceneDescriptor);
const sceneController = new SceneController(sceneInterface, sceneSynchronizer);

const serverAddress = 'ws://localhost:8080';
const clientMessageHandler = new ClientMessageHandler(serverAddress);






const camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 50 );
camera.position.set( 0, 1.6, 2.5 );
camera.updateMatrixWorld();
window.testMatrix = camera.matrixWorld;

const otherCameras = {};
const otherCamerasHelpers = {};
const otherPointers = {};
const otherPointersHelpers = {};

const grid = new THREE.GridHelper(20, 20)
sceneInterface.scene.add(grid)

window.otherCameras = otherCameras;


function addCamera(id) {
	otherCameras[id] = new THREE.PerspectiveCamera( 50, 16/9, 0.01, 1 );
	otherCamerasHelpers[id] = new THREE.CameraHelper(otherCameras[id]);
	sceneInterface.scene.add(otherCamerasHelpers[id]);
}

function removeCamera(id) {
	sceneInterface.scene.remove(otherCamerasHelpers[id]);
  	otherCamerasHelpers[id].dispose()
	delete(otherCameras[id]);
	delete(otherCamerasHelpers[id]);
}

const sphereGeometry = new THREE.SphereGeometry(0.1, 10, 10);
const sphereMaterial = new THREE.MeshBasicMaterial({color: 0x00FF00, wireframe: true});
function addPointer(id) {
	otherPointers[id] = {p0: new THREE.Vector3(), p1: new THREE.Vector3()};

	const sphereMesh0 = new THREE.Mesh(sphereGeometry, sphereMaterial);
	const sphereMesh1 = new THREE.Mesh(sphereGeometry, sphereMaterial);
	otherPointersHelpers[id] = {p0: sphereMesh0, p1: sphereMesh1};
	sceneInterface.scene.add(otherPointersHelpers[id].p0, otherPointersHelpers[id].p1);
}

function removePointer(id) {
	sceneInterface.scene.remove(otherPointersHelpers[id].p0, otherPointersHelpers[id].p1);
	delete(otherPointers[id]);
	delete(otherPointersHelpers[id]);
}

const sphereMaterial2 = new THREE.MeshBasicMaterial({color: 0xFF0000, wireframe: true});
const pointer = {p0: new THREE.Vector3(), p1: new THREE.Vector3()};
const pointerHelper = {p0:  new THREE.Mesh(sphereGeometry, sphereMaterial2), p1:  new THREE.Mesh(sphereGeometry, sphereMaterial2)};

sceneInterface.scene.add(pointerHelper.p0, pointerHelper.p1);



const SERVER_ID = 0;



let clientId = 0;
let otherClientsId = {};
let nbClients = 0;

const socket = new WebSocket('ws://localhost:8080');
socket.binaryType = 'arraybuffer'
// console.log(socket)

socket.onmessage = function(event) {
	// console.log(event)
	const data = new Float32Array(event.data);
	const buffer = event.data;
	const senderId = data[0];
	const commandId = data[1];
	/// sent by server
	if(senderId == SERVER_ID) {
    	switch(commandId) {
			case CommandTypes.SET_PLAYER:
				clientId = data[2];
				console.log(`Set player id ${data[2]}`);
				sendCameraData();
				break;
			case CommandTypes.NEW_PLAYER:
				++nbClients;
				otherClientsId[data[2]] = data[2];
				console.log(`New player joined ${data[2]}`);
				console.log(otherClientsId)

				addCamera(data[2]);
				addPointer(data[2]);
				break;
			case CommandTypes.REMOVE_PLAYER:
				--nbClients;
				delete(otherClientsId[data[2]])
				console.log(`Player ${data[2]} disconnected`);
				removeCamera(data[2]);
				removePointer(data[2]);
				break;
			default:
				break;
		}
    // console.log(data)
  	}
  	/// sent by other client
	else {
		switch ( commandId ) {
			case CommandTypes.UPDATE_CAMERA:
				updateCamera(senderId, {x: data[2], y: data[3], z: data[4]}, {x: data[5], y: data[6], z: data[7]});
				break;
			case CommandTypes.UPDATE_POINTER:
				updatePointer(senderId, {x: data[2], y: data[3], z: data[4]}, {x: data[5], y: data[6], z: data[7]});
				break;
			case CommandTypes.STRING:
				console.log("String received");
				decodeString(buffer);
				console.log(data);
				break;
			case CommandTypes.SELECT:
				console.log("select");
				receiveSelect(buffer);
				break;
			case CommandTypes.DESELECT:
				console.log("deselect");
				receiveDeselect(buffer);
				break;
			case CommandTypes.MATRIX:
				console.log("matrix");
				receiveTransform(buffer);
				break;
			default:
				console.log(data[0])
				console.log("unknown message type");
		}
			// console.log(data)
	}
};

function decodeString ( buffer ) {
	const view = new DataView(buffer);
	let offset = 0;
	
	const senderId = view.getFloat32(offset, true); offset += 4;
	const command = view.getFloat32(offset, true); offset += 4;
	const stringLength = view.getUint32(offset, true); offset += 4;

	const stringBytes = new Uint8Array(buffer, offset, stringLength);
	offset += stringLength;
	const decoder = new TextDecoder();
	const string = decoder.decode(stringBytes);

	const matrixArray = new Array(16);
	for(let i = 0; i < 16; ++i) {
		matrixArray[i] = view.getFloat32(offset, true);
		offset += 4;
	}
	const matrix = new THREE.Matrix4(...matrixArray)

	console.log(senderId, command, stringLength, string, matrix);
}


function updatePointer ( id, p0, p1 ) {
	otherPointers[id].p0.set(p0.x, p0.y, p0.z);
	otherPointers[id].p1.set(p1.x, p1.y, p1.z);

	otherPointersHelpers[id].p0.position.copy(otherPointers[id].p0);
	otherPointersHelpers[id].p1.position.copy(otherPointers[id].p1);
}

function updateCamera( id, position, rotation ) {
	otherCameras[id].position.set(position.x, position.y, position.z);
	otherCameras[id].rotation.set(rotation.x, rotation.y, rotation.z);
	otherCameras[id].updateMatrixWorld();
	otherCamerasHelpers[id].update();
}

function sendMessage ( text ) {
	socket.send(text);
}

function sendCameraData ( ) {
	const cameraData = new Float32Array([
		clientId,
		CommandTypes.UPDATE_CAMERA,
		sceneInterface.camera.position.x,
		sceneInterface.camera.position.y,
		sceneInterface.camera.position.z,
		sceneInterface.camera.rotation.x,
		sceneInterface.camera.rotation.y,
		sceneInterface.camera.rotation.z
	]);
	socket.send(cameraData);
}

function sendPointer ( ) {
	const {p0, p1} = sceneInterface.pointer;
	pointer.p0.copy(p0);
	pointer.p1.copy(p1);

	pointerHelper.p0.position.copy(pointer.p0);
	pointerHelper.p1.position.copy(pointer.p1);

	const pointerData = new Float32Array([
		clientId,
		CommandTypes.UPDATE_POINTER,
		pointer.p0.x,
		pointer.p0.y,
		pointer.p0.z,
		pointer.p1.x,
		pointer.p1.y,
		pointer.p1.z,
	]);
	socket.send(pointerData);
}

function sendSelect ( objectId ) {
	/// debug
	sceneSynchronizer.requestControl(objectId, false);
	///

	const stringEncoded =  new TextEncoder().encode(objectId);
	const stringLength = stringEncoded.length;

	/// clientId + Command + stringLength + string
	/// f32 + f32 + u32 + string + 16 * f32
	const bufferSize = 4 + 4 + 4 + Math.ceil(stringLength / 4) * 4;
	console.log(bufferSize);
	const buffer = new ArrayBuffer(bufferSize);
	const view = new DataView(buffer);

	let offset = 0;
	view.setFloat32(offset, clientId, true); offset += 4;
	view.setFloat32(offset, CommandTypes.SELECT, true); offset += 4;
	view.setUint32(offset, stringLength, true); offset += 4;
	new Uint8Array(buffer, offset, stringLength).set(stringEncoded);
	offset += stringLength;

	socket.send(buffer);
}

function sendDeselect ( objectId ) {
	/// debug
	sceneSynchronizer.releaseControl(objectId, false);
	///

	const stringEncoded =  new TextEncoder().encode(objectId);
	const stringLength = stringEncoded.length;

	/// clientId + Command + stringLength + string
	/// f32 + f32 + u32 + string + 16 * f32
	const bufferSize = 4 + 4 + 4 + Math.ceil(stringLength / 4) * 4;
	console.log(bufferSize);
	const buffer = new ArrayBuffer(bufferSize);
	const view = new DataView(buffer);

	let offset = 0;
	view.setFloat32(offset, clientId, true); offset += 4;
	view.setFloat32(offset, CommandTypes.DESELECT, true); offset += 4;
	view.setUint32(offset, stringLength, true); offset += 4;
	new Uint8Array(buffer, offset, stringLength).set(stringEncoded);
	offset += stringLength;

	socket.send(buffer);
}

function receiveSelect ( buffer ) {
	const view = new DataView(buffer);
	let offset = 0;
	
	const senderId = view.getFloat32(offset, true); offset += 4;
	const command = view.getFloat32(offset, true); offset += 4;
	const stringLength = view.getUint32(offset, true); offset += 4;

	const stringBytes = new Uint8Array(buffer, offset, stringLength);
	offset += stringLength;
	const decoder = new TextDecoder();
	const string = decoder.decode(stringBytes);


	console.log(senderId, command, stringLength, string);

	sceneSynchronizer.requestControl(string, false);
}

function receiveDeselect ( buffer ) {
	const view = new DataView(buffer);
	let offset = 0;
	
	const senderId = view.getFloat32(offset, true); offset += 4;
	const command = view.getFloat32(offset, true); offset += 4;
	const stringLength = view.getUint32(offset, true); offset += 4;

	const stringBytes = new Uint8Array(buffer, offset, stringLength);
	offset += stringLength;
	const decoder = new TextDecoder();
	const string = decoder.decode(stringBytes);


	console.log(senderId, command, stringLength, string);

	sceneSynchronizer.releaseControl(string, false);
}

function sendTransform ( objectId, matrix ) {
	/// debug
	sceneSynchronizer.setMatrix(objectId, matrix, false);
	///

	const encoder = new TextEncoder();
	const stringEncoded = encoder.encode(objectId);
	const stringLength = stringEncoded.length;

	/// clientId + Command + stringLength + string + matrix
	/// f32 + f32 + u32 + string + 16 * f32
	const bufferSize = 4 + 4 + 4 + Math.ceil(stringLength / 4) * 4 + 64;
	const buffer = new ArrayBuffer(bufferSize);
	const view = new DataView(buffer);

	let offset = 0;
	view.setFloat32(offset, clientId, true); offset += 4;
	view.setFloat32(offset, CommandTypes.MATRIX, true); offset += 4;
	view.setUint32(offset, stringLength, true); offset += 4;
	new Uint8Array(buffer, offset, stringLength).set(stringEncoded);
	offset += Math.ceil(stringLength / 4) * 4;

	const matrixArray = [];
	matrix.toArray(matrixArray);
	for(let i = 0; i < 16; ++i) {
		view.setFloat32(offset, matrixArray[i], true);
		offset += 4;
	}
	console.log(matrixArray)
	console.log(matrix)
	socket.send(buffer);
}

function receiveTransform ( buffer ) {
	const view = new DataView(buffer);
	let offset = 0;
	
	const senderId = view.getFloat32(offset, true); offset += 4;
	const command = view.getFloat32(offset, true); offset += 4;
	const stringLength = view.getUint32(offset, true); offset += 4;

	const stringBytes = new Uint8Array(buffer, offset, stringLength);
	// offset += stringLength;
	offset += Math.ceil(stringLength / 4) * 4;
	const decoder = new TextDecoder();
	const string = decoder.decode(stringBytes);

	const matrixArray = new Array(16);
	for(let i = 0; i < 16; ++i) {
		matrixArray[i] = view.getFloat32(offset, true);
		offset += 4;
	}
	const matrix = new THREE.Matrix4().fromArray(matrixArray)
	console.log(matrixArray)
	console.log(matrix)
	sceneSynchronizer.setMatrix(string, matrix, false);
	console.log(sceneSynchronizer.getMatrix(string));
}


// function t

window.sendMessage = sendMessage;
window.sendDeselect = sendDeselect;
window.sendSelect = sendSelect;
window.sendPointer = sendPointer;
window.sendTransform = sendTransform;
window.sendCameraData = sendCameraData;
window.scene = sceneInterface.scene;
function sendString( string ) {
	const encoder = new TextEncoder();
	const stringEncoded = encoder.encode(string);
	const stringLength = stringEncoded.length;

	/// clientId + Command + stringLength + string + matrix
	/// f32 + f32 + u32 + string + 16 * f32
	const bufferSize = 4 + 4 + 4 + stringLength + 64;
	const buffer = new ArrayBuffer(bufferSize);
	const view = new DataView(buffer);

	let offset = 0;
	view.setFloat32(offset, clientId, true); offset += 4;
	view.setFloat32(offset, CommandTypes.STRING, true); offset += 4;
	view.setUint32(offset, stringLength, true); offset += 4;
	new Uint8Array(buffer, offset, stringLength).set(stringEncoded);
	offset += stringLength;

	const matrixArray = [];
	const matrix = new THREE.Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
	matrix.toArray(matrixArray);
	for(let i = 0; i < 16; ++i) {
		view.setFloat32(offset, matrixArray[i], true);
		offset += 4;
	}

	socket.send(buffer);
}


window.sendString = sendString;

function animate() {


	sceneInterface.renderer.render( sceneInterface.scene, sceneInterface.camera );

	if( nbClients == 0 )
		return;

	if( sceneInterface.cameraNeedsUpdate )
		sendCameraData();

	if( sceneInterface.pointerNeedsUpdate )
		sendPointer();
}

sceneInterface.renderer.setAnimationLoop( animate );