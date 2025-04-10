import * as THREE from './Synchronizer/three/three.module.js';

import { GUI } from './Synchronizer/three/libs/lil-gui.module.min.js';
import Stats from './Synchronizer/three/libs/stats.module.js';

import { OrbitControls } from './Synchronizer/three/controls/OrbitControls.js';


import SceneInterface from './Synchronizer/SceneInterface.js';
import SceneDescriptor from './Synchronizer/SceneDescriptor.js';
import SceneController from './Synchronizer/SceneController.js';
import SceneSynchronizer from './Synchronizer/SceneSynchronizer.js';

const sceneInterface = new SceneInterface();
const sceneDescriptor = new SceneDescriptor();

const gltf = await sceneInterface.loadFile(`./scene.gltf`);
sceneDescriptor.loadGLTF(gltf.parser.json);

const sceneSynchronizer = new SceneSynchronizer(sceneInterface, sceneDescriptor);
const sceneController = new SceneController(sceneInterface, sceneSynchronizer);


const camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 50 );
camera.position.set( 0, 1.6, 2.5 );


const otherCameras = {};
const otherCamerasHelpers = {};
const otherPointers = {};
const otherPointersHelpers = {};

const grid = new THREE.GridHelper(20, 20)
sceneInterface.scene.add(grid)




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


let macroID = 0;
const NEW_PLAYER = macroID++;
const REMOVE_PLAYER = macroID++;
const UPDATE_CAMERA = macroID++;
const UPDATE_POINTER = macroID++;


let clientId = 0;
let otherClientsId = [];
let nbClients = 0;

const socket = new WebSocket('ws://localhost:8080');
socket.binaryType = 'arraybuffer'
// console.log(socket)

socket.onmessage = function(event) {
  // console.log(event.data)
  // console.log(typeof(event.data))
  // console.log(new Float32Array(event.data))

  const data = new Float32Array(event.data);
  const senderId = data[0];
  const commandId = data[1];
  // console.log(data)
  /// sent by server
  if(senderId == SERVER_ID) {
    switch(commandId) {
      case NEW_PLAYER:
        /// uninitialized, get self id
        if(clientId == 0){
          clientId = data[2];
          console.log(`Player id initialized ${data[2]}`);
		  sendCameraData();
        } 
        /// get other ids
        else {
          ++nbClients;
          otherClientsId[data[2]] = data[2];
          console.log(`New player joined ${data[2]}`);
          console.log(otherClientsId)

          addCamera(data[2]);
          addPointer(data[2]);
        }
        break;
      case REMOVE_PLAYER:
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
    switch(commandId){
      case UPDATE_CAMERA:
        updateCamera(senderId, {x: data[2], y: data[3], z: data[4]}, {x: data[5], y: data[6], z: data[7]});
		    break;
    	case UPDATE_POINTER:
		    updatePointer(senderId, {x: data[2], y: data[3], z: data[4]}, {x: data[5], y: data[6], z: data[7]});
		    break;
    }
    // console.log(data)
  }
};


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
		UPDATE_CAMERA,
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
		UPDATE_POINTER,
		pointer.p0.x,
		pointer.p0.y,
		pointer.p0.z,
		pointer.p1.x,
		pointer.p1.y,
		pointer.p1.z,
	]);
	socket.send(pointerData);
}

window.sendMessage = sendMessage;
window.sendPointer = sendPointer;
window.sendCameraData = sendCameraData;





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