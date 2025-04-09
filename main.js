import * as THREE from './Synchronizer/three/three.module.js';

import { GUI } from './Synchronizer/three/libs/lil-gui.module.min.js';
import Stats from './Synchronizer/three/libs/stats.module.js';

import { OrbitControls } from './Synchronizer/three/controls/OrbitControls.js';


import SceneInterface from './Synchronizer/SceneInterface.js';

const sceneInterface = new SceneInterface();
// const gltf = await sceneInterface.loadFile(`./scene.gltf`);



// const scene = new THREE.Scene();
// scene.background = new THREE.Color(0x555555);

// let ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
// scene.add(ambientLight);
// let pointLight0 = new THREE.PointLight(0xffffff, 100);
// pointLight0.position.set(5,4,5);
// scene.add(pointLight0);

const camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 50 );
camera.position.set( 0, 1.6, 2.5 );

// const renderer = new THREE.WebGLRenderer({antialias: true});
// renderer.autoClear = false;
// renderer.setPixelRatio( window.devicePixelRatio );
// renderer.setSize( window.innerWidth, window.innerHeight );
// document.body.appendChild( renderer.domElement );

// const orbitControls = new OrbitControls(camera, renderer.domElement);


const otherCameras = {};
const otherCamerasHelpers = {};


let testId = 123456;
// otherCameras[testId] = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.01, 1 );
// console.log(otherCameras[testId])
// otherCamerasHelpers[testId] = new THREE.CameraHelper(otherCameras[testId]);
// scene.add(otherCamerasHelpers[testId])
// console.log(camera)


const grid = new THREE.GridHelper(20, 20)
scene.add(grid)


const testCamera = otherCameras[testId]
const testCameraHelper = otherCamerasHelpers[testId]



function addCamera(id) {
  otherCameras[id] = new THREE.PerspectiveCamera( 50, 16/9, 0.01, 1 );
  otherCamerasHelpers[id] = new THREE.CameraHelper(otherCameras[id]);
  scene.add(otherCamerasHelpers[id]);
}

function removeCamera(id) {
  scene.remove(otherCamerasHelpers[id]);
  otherCamerasHelpers[id].dispose()
  delete(otherCameras[id]);
  delete(otherCamerasHelpers[id]);
}








const SERVER_ID = 0;

const NEW_PLAYER = 0;
const REMOVE_PLAYER = 1;
const UPDATE_CAMERA = 2;


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
        } 
        /// get other ids
        else {
          ++nbClients;
          otherClientsId[data[2]] = data[2];
          console.log(`New player joined ${data[2]}`);
          console.log(otherClientsId)

          addCamera(data[2]);
        }
        break;
      case REMOVE_PLAYER:
        --nbClients;
        delete(otherClientsId[data[2]])
        console.log(`Player ${data[2]} disconnected`);
        removeCamera(data[2]);
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
        // console.log("update camera")
        otherCameras[senderId].position.set(data[2], data[3], data[4]);
        otherCameras[senderId].rotation.set(data[5], data[6], data[7]);
        otherCameras[senderId].updateMatrixWorld()
        otherCamerasHelpers[senderId].update()
    }
    // console.log(data)
  }
};


function sendMessage(text) {
  socket.send(text);
}

function sendCameraData() {
  const cameraData = new Float32Array([
    clientId,
    UPDATE_CAMERA,
    camera.position.x,
    camera.position.y,
    camera.position.z,
    camera.rotation.x,
    camera.rotation.y,
    camera.rotation.z
  ]);
  socket.send(cameraData);
}


window.sendMessage = sendMessage;
window.sendCameraData = sendCameraData;





function animate() {
  if(nbClients)
    sendCameraData()
  // renderer.render( scene, camera );

  sceneInterface.renderer.render( sceneInterface.scene, sceneInterface.camera );
}

renderer.setAnimationLoop( animate );