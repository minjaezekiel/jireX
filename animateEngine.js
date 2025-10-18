
        /**
         * Developed by: Ezekiel Minja 
         * M Enterprise
         * Enhanced Animation Engine - Main class that manages the entire animation system
         */
        (
            function (global,factory){
                if (typeof(module) === "object" && typeof(module).exports === "object"){
                    // Node / CommonJS
                    module.exports = factory()
                }else{
                    // Browser global
                    global.AnimationEngine = factory()
                }
            }(typeof(window) !== "undefined" ? window : this, function (){

                class AnimationEngine {
                constructor(containerId) {
                this.container = document.getElementById(containerId);
                this.sceneManager = new SceneManager();
                this.animationManager = new AnimationManager(this.sceneManager);
                this.physicsManager = new PhysicsManager(this.sceneManager);
                this.uiManager = new UIManager(this, this.sceneManager, this.animationManager, this.physicsManager);
                this.editManager = new EditManager(this.sceneManager, this.uiManager);
                this.mediaManager = new MediaManager(this.sceneManager, this.animationManager);
                this.recordingManager = new RecordingManager(this.sceneManager, this.animationManager, this.mediaManager);
                
                // Initialize the engine
                this.init();
            }

            init() {
                // Set up the scene
                this.sceneManager.init(this.container);
                
                // Set up the UI
                this.uiManager.init();
                
                // Set up the edit manager
                this.editManager.init();
                
                // Set up the media manager
                this.mediaManager.init();
                
                // Set up the recording manager
                this.recordingManager.init();
                
                // Start the render loop
                this.animate();
                
                // Hide loading overlay
                document.getElementById('loadingOverlay').style.display = 'none';
            }

            animate() {
                requestAnimationFrame(() => this.animate());
                
                // Update the scene
                this.sceneManager.update();
                
                // Update physics
                this.physicsManager.update();
                
                // Update animations
                this.animationManager.update();
                
                // Update edit tools
                this.editManager.update();
                
                // Update media
                this.mediaManager.update();
                
                // Update recording
                this.recordingManager.update();
                
                // Update the UI
                this.uiManager.update();
                
                // Render the scene
                this.sceneManager.render();
            }
        }

        /**
         * Enhanced Scene Manager - Handles all scene-related operations
         */
        class SceneManager {
            constructor() {
                this.scene = null;
                this.camera = null;
                this.renderer = null;
                this.controls = null;
                this.selectedObject = null;
                this.objects = new Map(); // Map of object UUID to object
                this.lights = new Map(); // Map of light UUID to light
                this.groups = new Map(); // Map of group UUID to group
                this.objectProperties = new Map(); // Map of object UUID to custom properties
                this.raycaster = new THREE.Raycaster();
                this.mouse = new THREE.Vector2();
            }

            init(container) {
                // Create the scene
                this.scene = new THREE.Scene();
                this.scene.background = new THREE.Color(0x222222);
                
                // Create the camera
                const aspect = container.clientWidth / container.clientHeight;
                this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
                this.camera.position.set(5, 5, 5);
                this.camera.lookAt(0, 0, 0);
                
                // Create the renderer
                this.renderer = new THREE.WebGLRenderer({ antialias: true });
                this.renderer.setSize(container.clientWidth, container.clientHeight);
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                container.appendChild(this.renderer.domElement);
                
                // Add orbit controls
                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.05;
                
                // Add default lights
                this.addDefaultLights();
                
                // Add grid helper
                const gridHelper = new THREE.GridHelper(10, 10);
                this.scene.add(gridHelper);
                
                // Add axes helper
                const axesHelper = new THREE.AxesHelper(5);
                this.scene.add(axesHelper);
                
                // Handle window resize
                window.addEventListener('resize', () => this.onWindowResize());
                
                // Handle mouse events
                this.setupMouseEvents(container);
            }

            setupMouseEvents(container) {
                container.addEventListener('mousedown', (e) => this.onMouseDown(e));
                container.addEventListener('mousemove', (e) => this.onMouseMove(e));
                container.addEventListener('mouseup', (e) => this.onMouseUp(e));
                
                // Touch events
                container.addEventListener('touchstart', (e) => this.onTouchStart(e));
                container.addEventListener('touchmove', (e) => this.onTouchMove(e));
                container.addEventListener('touchend', (e) => this.onTouchEnd(e));
            }

            onMouseDown(event) {
                // Update mouse position
                const rect = this.renderer.domElement.getBoundingClientRect();
                this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                
                // Raycast to find objects
                this.raycaster.setFromCamera(this.mouse, this.camera);
                const intersects = this.raycaster.intersectObjects(Array.from(this.objects.values()));
                
                if (intersects.length > 0) {
                    const object = intersects[0].object;
                    
                    // If we're clicking on a light, select it
                    if (object.isLight || (object.parent && object.parent.isLight)) {
                        const light = object.isLight ? object : object.parent;
                        this.selectObject(light);
                        return;
                    }
                    
                    // If we're clicking on a regular object, select it
                    if (object.isMesh) {
                        this.selectObject(object);
                        return;
                    }
                    
                    // If we're clicking on a group, select it
                    if (object.type === 'Group') {
                        this.selectObject(object);
                        return;
                    }
                } else {
                    // If we're not clicking on anything, deselect
                    this.selectObject(null);
                }
            }

            onMouseMove(event) {
                // Update mouse position
                const rect = this.renderer.domElement.getBoundingClientRect();
                this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            }

            onMouseUp(event) {
                // Handle mouse up events
            }

            onTouchStart(event) {
                if (event.touches.length === 1) {
                    const touch = event.touches[0];
                    const mouseEvent = new MouseEvent('mousedown', {
                        clientX: touch.clientX,
                        clientY: touch.clientY
                    });
                    this.onMouseDown(mouseEvent);
                }
            }

            onTouchMove(event) {
                if (event.touches.length === 1) {
                    const touch = event.touches[0];
                    const mouseEvent = new MouseEvent('mousemove', {
                        clientX: touch.clientX,
                        clientY: touch.clientY
                    });
                    this.onMouseMove(mouseEvent);
                }
            }

            onTouchEnd(event) {
                const mouseEvent = new MouseEvent('mouseup', {});
                this.onMouseUp(mouseEvent);
            }

            addDefaultLights() {
                // Ambient light
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
                this.scene.add(ambientLight);
                this.lights.set(ambientLight.uuid, ambientLight);
                
                // Directional light
                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                directionalLight.position.set(5, 10, 7);
                directionalLight.castShadow = true;
                directionalLight.shadow.mapSize.width = 1024;
                directionalLight.shadow.mapSize.height = 1024;
                directionalLight.shadow.camera.near = 0.5;
                directionalLight.shadow.camera.far = 500;
                directionalLight.shadow.camera.left = -20;
                directionalLight.shadow.camera.right = 20;
                directionalLight.shadow.camera.top = 20;
                directionalLight.shadow.camera.bottom = -20;
                this.scene.add(directionalLight);
                this.lights.set(directionalLight.uuid, directionalLight);
            }

            onWindowResize() {
                const container = this.renderer.domElement.parentElement;
                this.camera.aspect = container.clientWidth / container.clientHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(container.clientWidth, container.clientHeight);
            }

            update() {
                this.controls.update();
            }

            render() {
                this.renderer.render(this.scene, this.camera);
            }

            addObject(object, name, properties = {}) {
                object.name = name || `Object_${this.objects.size + 1}`;
                this.scene.add(object);
                this.objects.set(object.uuid, object);
                
                // Store custom properties
                this.objectProperties.set(object.uuid, {
                    visible: true,
                    locked: false,
                    physicsEnabled: false,
                    mass: 1,
                    friction: 0.5,
                    restitution: 0.3,
                    isStatic: false,
                    ...properties
                });
                
                return object;
            }

            removeObject(object) {
                if (object.parent) {
                    object.parent.remove(object);
                }
                this.objects.delete(object.uuid);
                this.objectProperties.delete(object.uuid);
                
                // If it's a light, remove from lights map as well
                if (this.lights.has(object.uuid)) {
                    this.lights.delete(object.uuid);
                }
                
                // If it's a group, remove from groups map
                if (this.groups.has(object.uuid)) {
                    this.groups.delete(object.uuid);
                }
                
                // If this was the selected object, deselect it
                if (this.selectedObject === object) {
                    this.selectedObject = null;
                }
            }

            selectObject(object) {
                this.selectedObject = object;
            }

            getSelectedObject() {
                return this.selectedObject;
            }

            getObjectByUUID(uuid) {
                return this.objects.get(uuid);
            }

            getAllObjects() {
                return Array.from(this.objects.values());
            }

            getObjectProperties(uuid) {
                return this.objectProperties.get(uuid) || {};
            }

            setObjectProperties(uuid, properties) {
                if (this.objectProperties.has(uuid)) {
                    this.objectProperties.set(uuid, {
                        ...this.objectProperties.get(uuid),
                        ...properties
                    });
                }
            }

            createCube(name, properties = {}) {
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0x4fc3f7,
                    metalness: 0.2,
                    roughness: 0.5
                });
                const cube = new THREE.Mesh(geometry, material);
                cube.castShadow = true;
                cube.receiveShadow = true;
                return this.addObject(cube, name, properties);
            }

            createSphere(name, properties = {}) {
                const geometry = new THREE.SphereGeometry(0.5, 32, 32);
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0x4fc3f7,
                    metalness: 0.2,
                    roughness: 0.5
                });
                const sphere = new THREE.Mesh(geometry, material);
                sphere.castShadow = true;
                sphere.receiveShadow = true;
                return this.addObject(sphere, name, properties);
            }

            createCylinder(name, properties = {}) {
                const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0x4fc3f7,
                    metalness: 0.2,
                    roughness: 0.5
                });
                const cylinder = new THREE.Mesh(geometry, material);
                cylinder.castShadow = true;
                cylinder.receiveShadow = true;
                return this.addObject(cylinder, name, properties);
            }

            createCone(name, properties = {}) {
                const geometry = new THREE.ConeGeometry(0.5, 1, 32);
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0x4fc3f7,
                    metalness: 0.2,
                    roughness: 0.5
                });
                const cone = new THREE.Mesh(geometry, material);
                cone.castShadow = true;
                cone.receiveShadow = true;
                return this.addObject(cone, name, properties);
            }

            createTorus(name, properties = {}) {
                const geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0x4fc3f7,
                    metalness: 0.2,
                    roughness: 0.5
                });
                const torus = new THREE.Mesh(geometry, material);
                torus.castShadow = true;
                torus.receiveShadow = true;
                return this.addObject(torus, name, properties);
            }

            createTetrahedron(name, properties = {}) {
                const geometry = new THREE.TetrahedronGeometry(0.7, 0);
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0x4fc3f7,
                    metalness: 0.2,
                    roughness: 0.5
                });
                const tetrahedron = new THREE.Mesh(geometry, material);
                tetrahedron.castShadow = true;
                tetrahedron.receiveShadow = true;
                return this.addObject(tetrahedron, name, properties);
            }

            createLight(type, name, properties = {}) {
                let light;
                
                switch (type) {
                    case 'point':
                        light = new THREE.PointLight(0xffffff, 1, 100);
                        light.position.set(0, 3, 0);
                        light.castShadow = true;
                        break;
                    case 'spot':
                        light = new THREE.SpotLight(0xffffff, 1);
                        light.position.set(0, 5, 0);
                        light.angle = Math.PI / 6;
                        light.penumbra = 0.1;
                        light.castShadow = true;
                        break;
                    case 'directional':
                        light = new THREE.DirectionalLight(0xffffff, 1);
                        light.position.set(5, 10, 7);
                        light.castShadow = true;
                        break;
                    case 'ambient':
                        light = new THREE.AmbientLight(0xffffff, 0.5);
                        break;
                    default:
                        light = new THREE.PointLight(0xffffff, 1, 100);
                        light.position.set(0, 3, 0);
                        light.castShadow = true;
                }
                
                // Add a helper for the light
                let helper;
                if (type === 'point') {
                    helper = new THREE.PointLightHelper(light, 0.5);
                } else if (type === 'spot') {
                    helper = new THREE.SpotLightHelper(light);
                } else if (type === 'directional') {
                    helper = new THREE.DirectionalLightHelper(light, 1);
                }
                
                if (helper) {
                    light.add(helper);
                }
                
                this.scene.add(light);
                this.lights.set(light.uuid, light);
                light.name = name || `Light_${this.lights.size}`;
                
                // Store properties
                this.objectProperties.set(light.uuid, {
                    visible: true,
                    locked: false,
                    ...properties
                });
                
                return light;
            }

            createGroup(name, properties = {}) {
                const group = new THREE.Group();
                group.name = name || `Group_${this.objects.size + 1}`;
                this.scene.add(group);
                this.objects.set(group.uuid, group);
                this.groups.set(group.uuid, group);
                
                // Store properties
                this.objectProperties.set(group.uuid, {
                    visible: true,
                    locked: false,
                    ...properties
                });
                
                return group;
            }

            addToGroup(object, group) {
                if (object.parent) {
                    object.parent.remove(object);
                }
                group.add(object);
            }

            removeFromGroup(object) {
                if (object.parent && object.parent.type === 'Group') {
                    object.parent.remove(object);
                    this.scene.add(object);
                }
            }

            toggleObjectVisibility(object) {
                const uuid = object.uuid;
                if (this.objectProperties.has(uuid)) {
                    const properties = this.objectProperties.get(uuid);
                    properties.visible = !properties.visible;
                    object.visible = properties.visible;
                    this.objectProperties.set(uuid, properties);
                    return properties.visible;
                }
                return true;
            }

            toggleObjectLock(object) {
                const uuid = object.uuid;
                if (this.objectProperties.has(uuid)) {
                    const properties = this.objectProperties.get(uuid);
                    properties.locked = !properties.locked;
                    this.objectProperties.set(uuid, properties);
                    return properties.locked;
                }
                return false;
            }

            // Export scene data
            exportScene() {
                const sceneData = {
                    objects: [],
                    lights: [],
                    groups: [],
                    metadata: {
                        version: '1.0',
                        exportDate: new Date().toISOString()
                    }
                };
                
                // Export objects
                this.objects.forEach((object, uuid) => {
                    if (object.type === 'Group') {
                        sceneData.groups.push({
                            uuid: object.uuid,
                            name: object.name,
                            type: object.type,
                            position: [object.position.x, object.position.y, object.position.z],
                            rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
                            scale: [object.scale.x, object.scale.y, object.scale.z],
                            children: object.children.map(child => child.uuid),
                            properties: this.objectProperties.get(uuid)
                        });
                    } else if (object.isLight) {
                        sceneData.lights.push({
                            uuid: object.uuid,
                            name: object.name,
                            type: object.type,
                            position: [object.position.x, object.position.y, object.position.z],
                            color: object.color.getHex(),
                            intensity: object.intensity,
                            properties: this.objectProperties.get(uuid)
                        });
                    } else if (object.isMesh) {
                        sceneData.objects.push({
                            uuid: object.uuid,
                            name: object.name,
                            type: object.type,
                            geometry: object.geometry.type,
                            material: {
                                type: object.material.type,
                                color: object.material.color.getHex()
                            },
                            position: [object.position.x, object.position.y, object.position.z],
                            rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
                            scale: [object.scale.x, object.scale.y, object.scale.z],
                            properties: this.objectProperties.get(uuid)
                        });
                    }
                });
                
                return JSON.stringify(sceneData, null, 2);
            }

            // Import scene data
            importScene(sceneData) {
                try {
                    const data = JSON.parse(sceneData);
                    
                    // Clear current scene
                    this.objects.forEach(object => {
                        this.removeObject(object);
                    });
                    
                    // Import groups first
                    if (data.groups) {
                        data.groups.forEach(groupData => {
                            const group = this.createGroup(groupData.name, groupData.properties);
                            group.position.set(...groupData.position);
                            group.rotation.set(...groupData.rotation);
                            group.scale.set(...groupData.scale);
                        });
                    }
                    
                    // Import objects
                    if (data.objects) {
                        data.objects.forEach(objectData => {
                            let object;
                            
                            switch (objectData.geometry) {
                                case 'BoxGeometry':
                                    object = this.createCube(objectData.name, objectData.properties);
                                    break;
                                case 'SphereGeometry':
                                    object = this.createSphere(objectData.name, objectData.properties);
                                    break;
                                case 'CylinderGeometry':
                                    object = this.createCylinder(objectData.name, objectData.properties);
                                    break;
                                case 'ConeGeometry':
                                    object = this.createCone(objectData.name, objectData.properties);
                                    break;
                                case 'TorusGeometry':
                                    object = this.createTorus(objectData.name, objectData.properties);
                                    break;
                                case 'TetrahedronGeometry':
                                    object = this.createTetrahedron(objectData.name, objectData.properties);
                                    break;
                                default:
                                    object = this.createCube(objectData.name, objectData.properties);
                            }
                            
                            object.position.set(...objectData.position);
                            object.rotation.set(...objectData.rotation);
                            object.scale.set(...objectData.scale);
                            
                            if (objectData.material && objectData.material.color) {
                                object.material.color.setHex(objectData.material.color);
                            }
                            
                            // Add to group if specified
                            if (objectData.parent) {
                                const parent = this.getObjectByUUID(objectData.parent);
                                if (parent && parent.type === 'Group') {
                                    this.addToGroup(object, parent);
                                }
                            }
                        });
                    }
                    
                    // Import lights
                    if (data.lights) {
                        data.lights.forEach(lightData => {
                            const light = this.createLight(lightData.type.toLowerCase(), lightData.name, lightData.properties);
                            light.position.set(...lightData.position);
                            light.color.setHex(lightData.color);
                            light.intensity = lightData.intensity;
                        });
                    }
                    
                    return true;
                } catch (error) {
                    console.error('Error importing scene:', error);
                    return false;
                }
            }

            // Import 3D model
            importModel(file, callback) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const contents = event.target.result;
                    
                    // Use GLTFLoader to load the model
                    const loader = new THREE.GLTFLoader();
                    
                    try {
                        loader.parse(contents, '', (gltf) => {
                            const model = gltf.scene;
                            
                            // Add model to scene
                            this.addObject(model, file.name.replace(/\.[^/.]+$/, ""));
                            
                            // Process animations if available
                            if (gltf.animations && gltf.animations.length > 0) {
                                // Create animation clips for each animation
                                gltf.animations.forEach((clip, index) => {
                                    const animationName = clip.name || `Animation_${index + 1}`;
                                    this.animationManager.createAnimation(animationName, clip.duration, 'repeat');
                                    
                                    // Store the clip for later use
                                    this.animationManager.animationClips.set(animationName, clip);
                                });
                            }
                            
                            // Set up model properties
                            model.traverse((child) => {
                                if (child.isMesh) {
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                    
                                    // Add to objects map
                                    this.objects.set(child.uuid, child);
                                    
                                    // Set default properties
                                    this.objectProperties.set(child.uuid, {
                                        visible: true,
                                        locked: false,
                                        physicsEnabled: false
                                    });
                                }
                            });
                            
                            callback(true, model);
                        }, (error) => {
                            console.error('Error parsing GLTF:', error);
                            callback(false, null);
                        });
                    } catch (error) {
                        console.error('Error loading model:', error);
                        callback(false, null);
                    }
                };
                
                reader.readAsArrayBuffer(file);
            }
        }

        /**
         * Enhanced Animation Manager - Handles all animation-related operations
         */
        class AnimationManager {
            constructor(sceneManager) {
                this.sceneManager = sceneManager;
                this.animations = new Map(); // Map of animation name to animation
                this.selectedAnimation = null;
                this.isPlaying = false;
                this.currentTime = 0;
                this.clock = new THREE.Clock();
                this.mixers = new Map(); // Map of object UUID to mixer
                this.tweens = new Map(); // Map of object UUID to tween
                this.animationClips = new Map(); // Map of animation name to clip
            }

            update() {
                if (this.isPlaying) {
                    const delta = this.clock.getDelta();
                    this.currentTime += delta;
                    
                    // Update all mixers
                    this.mixers.forEach(mixer => {
                        mixer.update(delta);
                    });
                    
                    // Update all tweens
                    this.tweens.forEach(tween => {
                        tween.update();
                    });
                    
                    // Check if we've reached the end of the animation
                    if (this.selectedAnimation && this.currentTime >= this.selectedAnimation.duration) {
                        if (this.selectedAnimation.loop === 'once') {
                            this.stop();
                        } else if (this.selectedAnimation.loop === 'repeat') {
                            this.currentTime = 0;
                        } else if (this.selectedAnimation.loop === 'pingpong') {
                            // Reverse the animation
                            this.mixers.forEach(mixer => {
                                mixer.timeScale = -mixer.timeScale;
                            });
                        }
                    }
                }
            }

            createAnimation(name, duration, loop = 'once') {
                const animation = {
                    name,
                    duration,
                    loop,
                    keyframes: new Map(), // Map of object UUID to keyframes
                    curves: new Map(), // Map of object UUID to curves
                    tweens: new Map() // Map of object UUID to tweens
                };
                
                this.animations.set(name, animation);
                return animation;
            }

            deleteAnimation(name) {
                if (this.animations.has(name)) {
                    this.animations.delete(name);
                    
                    if (this.selectedAnimation && this.selectedAnimation.name === name) {
                        this.selectedAnimation = null;
                    }
                    
                    return true;
                }
                return false;
            }

            duplicateAnimation(name, newName) {
                if (this.animations.has(name)) {
                    const original = this.animations.get(name);
                    const duplicate = {
                        ...original,
                        name: newName,
                        keyframes: new Map(original.keyframes),
                        curves: new Map(original.curves),
                        tweens: new Map(original.tweens)
                    };
                    
                    this.animations.set(newName, duplicate);
                    return duplicate;
                }
                return null;
            }

            selectAnimation(name) {
                if (this.animations.has(name)) {
                    this.selectedAnimation = this.animations.get(name);
                    return true;
                }
                return false;
            }

            getSelectedAnimation() {
                return this.selectedAnimation;
            }

            getAllAnimations() {
                return Array.from(this.animations.values());
            }

            play() {
                if (this.selectedAnimation) {
                    this.isPlaying = true;
                    this.clock.start();
                    
                    // Update all mixers to play the selected animation
                    this.mixers.forEach((mixer, uuid) => {
                        const object = this.sceneManager.getObjectByUUID(uuid);
                        if (object && this.selectedAnimation.keyframes.has(uuid)) {
                            const clip = this.createAnimationClip(object, this.selectedAnimation);
                            const action = mixer.clipAction(clip);
                            action.reset();
                            action.play();
                        }
                    });
                    
                    // Start all tweens
                    this.tweens.forEach(tween => {
                        tween.start();
                    });
                }
            }

            pause() {
                this.isPlaying = false;
                this.clock.stop();
                
                // Pause all mixers
                this.mixers.forEach(mixer => {
                    mixer.timeScale = 0;
                });
                
                // Pause all tweens
                this.tweens.forEach(tween => {
                    tween.pause();
                });
            }

            stop() {
                this.isPlaying = false;
                this.currentTime = 0;
                this.clock.stop();
                
                // Stop all mixers
                this.mixers.forEach(mixer => {
                    mixer.timeScale = 1;
                    mixer.time = 0;
                });
                
                // Stop all tweens
                this.tweens.forEach(tween => {
                    tween.stop();
                });
            }

            setCurrentTime(time) {
                this.currentTime = time;
                
                // Update all mixers
                this.mixers.forEach(mixer => {
                    mixer.setTime(time);
                });
                
                // Update all tweens
                this.tweens.forEach(tween => {
                    tween.seek(time);
                });
            }

            addKeyframe(object, time, properties) {
                if (!this.selectedAnimation) {
                    return false;
                }
                
                const uuid = object.uuid;
                
                if (!this.selectedAnimation.keyframes.has(uuid)) {
                    this.selectedAnimation.keyframes.set(uuid, []);
                }
                
                const keyframes = this.selectedAnimation.keyframes.get(uuid);
                
                // Check if a keyframe already exists at this time
                const existingIndex = keyframes.findIndex(kf => kf.time === time);
                
                if (existingIndex !== -1) {
                    // Update existing keyframe
                    keyframes[existingIndex] = { time, properties };
                } else {
                    // Add new keyframe
                    keyframes.push({ time, properties });
                    keyframes.sort((a, b) => a.time - b.time);
                }
                
                // Create or update mixer for this object
                if (!this.mixers.has(uuid)) {
                    this.mixers.set(uuid, new THREE.AnimationMixer(object));
                }
                
                return true;
            }

            removeKeyframe(object, time) {
                if (!this.selectedAnimation) {
                    return false;
                }
                
                const uuid = object.uuid;
                
                if (!this.selectedAnimation.keyframes.has(uuid)) {
                    return false;
                }
                
                const keyframes = this.selectedAnimation.keyframes.get(uuid);
                const index = keyframes.findIndex(kf => kf.time === time);
                
                if (index !== -1) {
                    keyframes.splice(index, 1);
                    
                    // If no more keyframes for this object, remove the mixer
                    if (keyframes.length === 0) {
                        this.mixers.delete(uuid);
                    }
                    
                    return true;
                }
                
                return false;
            }

            getKeyframes(object) {
                if (!this.selectedAnimation) {
                    return [];
                }
                
                const uuid = object.uuid;
                
                if (!this.selectedAnimation.keyframes.has(uuid)) {
                    return [];
                }
                
                return this.selectedAnimation.keyframes.get(uuid);
            }

            createAnimationClip(object, animation) {
                const uuid = object.uuid;
                const keyframes = animation.keyframes.get(uuid);
                
                if (!keyframes || keyframes.length === 0) {
                    return null;
                }
                
                const tracks = [];
                
                // Process position keyframes
                const positionTimes = [];
                const positionValues = [];
                
                keyframes.forEach(kf => {
                    if (kf.properties.position) {
                        positionTimes.push(kf.time);
                        positionValues.push(...kf.properties.position);
                    }
                });
                
                if (positionTimes.length > 0) {
                    tracks.push(new THREE.VectorKeyframeTrack(
                        `${object.uuid}.position`,
                        positionTimes,
                        positionValues
                    ));
                }
                
                // Process rotation keyframes
                const rotationTimes = [];
                const rotationValues = [];
                
                keyframes.forEach(kf => {
                    if (kf.properties.rotation) {
                        rotationTimes.push(kf.time);
                        // Convert Euler angles to quaternion
                        const quaternion = new THREE.Quaternion();
                        quaternion.setFromEuler(new THREE.Euler(
                            kf.properties.rotation[0],
                            kf.properties.rotation[1],
                            kf.properties.rotation[2]
                        ));
                        rotationValues.push(...quaternion.toArray());
                    }
                });
                
                if (rotationTimes.length > 0) {
                    tracks.push(new THREE.QuaternionKeyframeTrack(
                        `${object.uuid}.quaternion`,
                        rotationTimes,
                        rotationValues
                    ));
                }
                
                // Process scale keyframes
                const scaleTimes = [];
                const scaleValues = [];
                
                keyframes.forEach(kf => {
                    if (kf.properties.scale) {
                        scaleTimes.push(kf.time);
                        scaleValues.push(...kf.properties.scale);
                    }
                });
                
                if (scaleTimes.length > 0) {
                    tracks.push(new THREE.VectorKeyframeTrack(
                        `${object.uuid}.scale`,
                        scaleTimes,
                        scaleValues
                    ));
                }
                
                return new THREE.AnimationClip(animation.name, animation.duration, tracks);
            }

            setCurve(object, property, channel, curve) {
                if (!this.selectedAnimation) {
                    return false;
                }
                
                const uuid = object.uuid;
                
                if (!this.selectedAnimation.curves.has(uuid)) {
                    this.selectedAnimation.curves.set(uuid, {});
                }
                
                const curves = this.selectedAnimation.curves.get(uuid);
                
                if (!curves[property]) {
                    curves[property] = {};
                }
                
                curves[property][channel] = curve;
                
                return true;
            }

            getCurve(object, property, channel) {
                if (!this.selectedAnimation) {
                    return null;
                }
                
                const uuid = object.uuid;
                
                if (!this.selectedAnimation.curves.has(uuid)) {
                    return null;
                }
                
                const curves = this.selectedAnimation.curves.get(uuid);
                
                if (!curves[property] || !curves[property][channel]) {
                    return null;
                }
                
                return curves[property][channel];
            }

            createTween(object, from, to, duration, easing = 'linear') {
                const uuid = object.uuid;
                
                if (!this.selectedAnimation) {
                    return false;
                }
                
                if (!this.selectedAnimation.tweens.has(uuid)) {
                    this.selectedAnimation.tweens.set(uuid, []);
                }
                
                const tweens = this.selectedAnimation.tweens.get(uuid);
                
                const tween = {
                    from: { ...from },
                    to: { ...to },
                    duration,
                    easing,
                    startTime: this.currentTime,
                    object: object
                };
                
                tweens.push(tween);
                
                // Create tween instance
                if (!this.tweens.has(uuid)) {
                    this.tweens.set(uuid, []);
                }
                
                const objectTweens = this.tweens.get(uuid);
                objectTweens.push(this.createTweenInstance(tween));
                
                return true;
            }

            createTweenInstance(tweenData) {
                // Simple tween implementation
                // In a real implementation, you would use a tweening library
                const tween = {
                    startTime: tweenData.startTime,
                    duration: tweenData.duration,
                    from: tweenData.from,
                    to: tweenData.to,
                    object: tweenData.object,
                    easing: tweenData.easing,
                    
                    update: function() {
                        const currentTime = this.animationManager.currentTime;
                        const elapsed = currentTime - this.startTime;
                        
                        if (elapsed < 0 || elapsed > this.duration) {
                            return;
                        }
                        
                        const progress = Math.min(1, elapsed / this.duration);
                        const easedProgress = this.applyEasing(progress, this.easing);
                        
                        // Interpolate values
                        for (const property in this.from) {
                            if (this.to.hasOwnProperty(property)) {
                                const fromVal = this.from[property];
                                const toVal = this.to[property];
                                const currentVal = fromVal + (toVal - fromVal) * easedProgress;
                                
                                // Apply to object
                                if (property === 'position') {
                                    this.object.position.set(
                                        currentVal.x || currentVal[0],
                                        currentVal.y || currentVal[1],
                                        currentVal.z || currentVal[2]
                                    );
                                } else if (property === 'rotation') {
                                    this.object.rotation.set(
                                        currentVal.x || currentVal[0],
                                        currentVal.y || currentVal[1],
                                        currentVal.z || currentVal[2]
                                    );
                                } else if (property === 'scale') {
                                    this.object.scale.set(
                                        currentVal.x || currentVal[0],
                                        currentVal.y || currentVal[1],
                                        currentVal.z || currentVal[2]
                                    );
                                } else if (property === 'color' && this.object.material) {
                                    this.object.material.color.setHex(currentVal);
                                }
                            }
                        }
                    },
                    
                    applyEasing: function(t, easing) {
                        switch (easing) {
                            case 'easeIn':
                                return t * t;
                            case 'easeOut':
                                return t * (2 - t);
                            case 'easeInOut':
                                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                            default: // linear
                                return t;
                        }
                    },
                    
                    start: function() {
                        this.startTime = this.animationManager.currentTime;
                    },
                    
                    pause: function() {
                        // Implementation would track paused state
                    },
                    
                    stop: function() {
                        // Implementation would reset object to initial state
                    },
                    
                    seek: function(time) {
                        // Implementation would set object to specific time in tween
                    }
                };
                
                // Bind animation manager to tween
                tween.animationManager = this;
                
                return tween;
            }

            // Export animation data
            exportAnimation(name) {
                if (!this.animations.has(name)) {
                    return null;
                }
                
                const animation = this.animations.get(name);
                const exportData = {
                    name: animation.name,
                    duration: animation.duration,
                    loop: animation.loop,
                    keyframes: {},
                    curves: {},
                    tweens: {},
                    metadata: {
                        version: '1.0',
                        exportDate: new Date().toISOString()
                    }
                };
                
                // Export keyframes
                animation.keyframes.forEach((keyframes, uuid) => {
                    exportData.keyframes[uuid] = keyframes;
                });
                
                // Export curves
                animation.curves.forEach((curves, uuid) => {
                    exportData.curves[uuid] = curves;
                });
                
                // Export tweens
                animation.tweens.forEach((tweens, uuid) => {
                    exportData.tweens[uuid] = tweens;
                });
                
                return JSON.stringify(exportData, null, 2);
            }

            // Import animation data
            importAnimation(animationData) {
                try {
                    const data = JSON.parse(animationData);
                    
                    const animation = this.createAnimation(data.name, data.duration, data.loop);
                    
                    // Import keyframes
                    if (data.keyframes) {
                        Object.keys(data.keyframes).forEach(uuid => {
                            animation.keyframes.set(uuid, data.keyframes[uuid]);
                        });
                    }
                    
                    // Import curves
                    if (data.curves) {
                        Object.keys(data.curves).forEach(uuid => {
                            animation.curves.set(uuid, data.curves[uuid]);
                        });
                    }
                    
                    // Import tweens
                    if (data.tweens) {
                        Object.keys(data.tweens).forEach(uuid => {
                            animation.tweens.set(uuid, data.tweens[uuid]);
                        });
                    }
                    
                    return animation;
                } catch (error) {
                    console.error('Error importing animation:', error);
                    return null;
                }
            }
        }

        /**
         * Physics Manager - Handles physics simulation
         */
        class PhysicsManager {
            constructor(sceneManager) {
                this.sceneManager = sceneManager;
                this.world = null;
                this.enabled = false;
                this.objects = new Map(); // Map of object UUID to physics body
                this.gravity = -9.8;
                this.timeStep = 1 / 60;
            }

            init() {
                // Create physics world
                this.world = new CANNON.World();
                this.world.gravity.set(0, this.gravity, 0);
                this.world.broadphase = new CANNON.NaiveBroadphase();
                this.world.solver.iterations = 10;
            }

            update() {
                if (this.enabled && this.world) {
                    // Step the physics world
                    this.world.step(this.timeStep);
                    
                    // Update Three.js objects based on physics bodies
                    this.objects.forEach((body, uuid) => {
                        const object = this.sceneManager.getObjectByUUID(uuid);
                        if (object) {
                            object.position.copy(body.position);
                            object.quaternion.copy(body.quaternion);
                        }
                    });
                }
            }

            enable() {
                this.enabled = true;
                if (!this.world) {
                    this.init();
                }
            }

            disable() {
                this.enabled = false;
            }

            toggle() {
                this.enabled = !this.enabled;
                if (this.enabled && !this.world) {
                    this.init();
                }
                return this.enabled;
            }

            addObject(object, properties = {}) {
                if (!this.enabled || !this.world) return;
                
                const uuid = object.uuid;
                let body;
                
                // Create physics body based on object type
                if (object.geometry) {
                    if (object.geometry.type === 'BoxGeometry') {
                        const size = object.geometry.parameters;
                        const halfExtents = new CANNON.Vec3(size.width / 2, size.height / 2, size.depth / 2);
                        const shape = new CANNON.Box(halfExtents);
                        body = new CANNON.Body({
                            mass: properties.mass || 1,
                            position: new CANNON.Vec3(
                                object.position.x,
                                object.position.y,
                                object.position.z
                            ),
                            shape: shape
                        });
                    } else if (object.geometry.type === 'SphereGeometry') {
                        const radius = object.geometry.parameters.radius;
                        const shape = new CANNON.Sphere(radius);
                        body = new CANNON.Body({
                            mass: properties.mass || 1,
                            position: new CANNON.Vec3(
                                object.position.x,
                                object.position.y,
                                object.position.z
                            ),
                            shape: shape
                        });
                    } else if (object.geometry.type === 'CylinderGeometry') {
                        const params = object.geometry.parameters;
                        const shape = new CANNON.Cylinder(params.radiusTop, params.radiusBottom, params.height, params.radialSegments);
                        body = new CANNON.Body({
                            mass: properties.mass || 1,
                            position: new CANNON.Vec3(
                                object.position.x,
                                object.position.y,
                                object.position.z
                            ),
                            shape: shape
                        });
                    } else if (object.geometry.type === 'ConeGeometry') {
                        const params = object.geometry.parameters;
                        const shape = new CANNON.Cylinder(0, params.radius, params.height, params.radialSegments);
                        body = new CANNON.Body({
                            mass: properties.mass || 1,
                            position: new CANNON.Vec3(
                                object.position.x,
                                object.position.y,
                                object.position.z
                            ),
                            shape: shape
                        });
                    } else if (object.geometry.type === 'TorusGeometry') {
                        // Approximate torus with a sphere for physics
                        const params = object.geometry.parameters;
                        const radius = params.radius + params.tube;
                        const shape = new CANNON.Sphere(radius);
                        body = new CANNON.Body({
                            mass: properties.mass || 1,
                            position: new CANNON.Vec3(
                                object.position.x,
                                object.position.y,
                                object.position.z
                            ),
                            shape: shape
                        });
                    } else if (object.geometry.type === 'TetrahedronGeometry') {
                        // Approximate tetrahedron with a sphere for physics
                        const params = object.geometry.parameters;
                        const radius = params.radius;
                        const shape = new CANNON.Sphere(radius);
                        body = new CANNON.Body({
                            mass: properties.mass || 1,
                            position: new CANNON.Vec3(
                                object.position.x,
                                object.position.y,
                                object.position.z
                            ),
                            shape: shape
                        });
                    }
                    
                    if (body) {
                        body.material = new CANNON.Material();
                        body.material.friction = properties.friction || 0.5;
                        body.material.restitution = properties.restitution || 0.3;
                        
                        if (properties.isStatic) {
                            body.mass = 0;
                            body.type = CANNON.Body.STATIC;
                        }
                        
                        this.world.addBody(body);
                        this.objects.set(uuid, body);
                    }
                }
            }

            removeObject(object) {
                const uuid = object.uuid;
                if (this.objects.has(uuid)) {
                    const body = this.objects.get(uuid);
                    this.world.removeBody(body);
                    this.objects.delete(uuid);
                }
            }

            updateObjectProperties(object, properties) {
                const uuid = object.uuid;
                if (this.objects.has(uuid)) {
                    const body = this.objects.get(uuid);
                    
                    if (properties.mass !== undefined) {
                        body.mass = properties.mass;
                        body.updateMassProperties();
                    }
                    
                    if (properties.friction !== undefined) {
                        body.material.friction = properties.friction;
                    }
                    
                    if (properties.restitution !== undefined) {
                        body.material.restitution = properties.restitution;
                    }
                    
                    if (properties.isStatic !== undefined) {
                        if (properties.isStatic) {
                            body.mass = 0;
                            body.type = CANNON.Body.STATIC;
                        } else {
                            body.mass = properties.mass || 1;
                            body.type = CANNON.Body.DYNAMIC;
                        }
                        body.updateMassProperties();
                    }
                }
            }
        }

        /**
         * Edit Manager - Handles object editing, sculpting, and transform operations
         */
        class EditManager {
            constructor(sceneManager, uiManager) {
                this.sceneManager = sceneManager;
                this.uiManager = uiManager;
                this.currentTool = 'select';
                this.isDragging = false;
                this.dragStart = new THREE.Vector2();
                this.dragObject = null;
                this.dragOffset = new THREE.Vector3();
                this.transformGizmo = null;
                this.lightHelper = null;
                this.sculptOverlay = null;
                this.sculptCursor = null;
                this.sculptSize = 0.5;
                this.sculptStrength = 1.0;
                this.sculptTool = 'push';
                this.isSculpting = false;
                this.originalVertices = null;
                this.modifiedVertices = null;
            }

            init() {
                // Initialize transform gizmo
                this.initTransformGizmo();
                
                // Initialize light helper
                this.initLightHelper();
                
                // Initialize sculpt overlay
                this.initSculptOverlay();
                
                // Set up event listeners
                this.setupEventListeners();
            }

            initTransformGizmo() {
                this.transformGizmo = document.getElementById('transformGizmo');
            }

            initLightHelper() {
                this.lightHelper = document.getElementById('lightHelper');
            }

            initSculptOverlay() {
                this.sculptOverlay = document.getElementById('sculptOverlay');
                this.sculptCursor = document.getElementById('sculptCursor');
            }

            setupEventListeners() {
                // Tool buttons
                document.getElementById('selectTool').addEventListener('click', () => this.setTool('select'));
                document.getElementById('moveTool').addEventListener('click', () => this.setTool('move'));
                document.getElementById('rotateTool').addEventListener('click', () => this.setTool('rotate'));
                document.getElementById('scaleTool').addEventListener('click', () => this.setTool('scale'));
                
                // Sculpt tool buttons
                document.getElementById('sculptPushTool').addEventListener('click', () => this.setSculptTool('push'));
                document.getElementById('sculptPullTool').addEventListener('click', () => this.setSculptTool('pull'));
                document.getElementById('sculptSmoothTool').addEventListener('click', () => this.setSculptTool('smooth'));
                document.getElementById('sculptRidgeTool').addEventListener('click', () => this.setSculptTool('ridge'));
                document.getElementById('sculptPinchTool').addEventListener('click', () => this.setSculptTool('pinch'));
                document.getElementById('sculptFlattenTool').addEventListener('click', () => this.setSculptTool('flatten'));
                
                // Sculpt tool options
                document.getElementById('sculptSize').addEventListener('input', (e) => {
                    this.sculptSize = parseFloat(e.target.value);
                    document.getElementById('sculptSizeValue').textContent = this.sculptSize.toFixed(1);
                });
                
                document.getElementById('sculptStrength').addEventListener('input', (e) => {
                    this.sculptStrength = parseFloat(e.target.value);
                    document.getElementById('sculptStrengthValue').textContent = this.sculptStrength.toFixed(1);
                });
                
                // Mouse events for dragging
                const viewport = document.getElementById('viewport');
                viewport.addEventListener('mousedown', (e) => this.onMouseDown(e));
                viewport.addEventListener('mousemove', (e) => this.onMouseMove(e));
                viewport.addEventListener('mouseup', (e) => this.onMouseUp(e));
                
                // Touch events
                viewport.addEventListener('touchstart', (e) => this.onTouchStart(e));
                viewport.addEventListener('touchmove', (e) => this.onTouchMove(e));
                viewport.addEventListener('touchend', (e) => this.onTouchEnd(e));
            }

            setTool(tool) {
                this.currentTool = tool;
                
                // Update button states
                document.querySelectorAll('.edit-tools .tool-button').forEach(button => {
                    button.classList.remove('active');
                });
                
                if (tool === 'select') {
                    document.getElementById('selectTool').classList.add('active');
                } else if (tool === 'move') {
                    document.getElementById('moveTool').classList.add('active');
                } else if (tool === 'rotate') {
                    document.getElementById('rotateTool').classList.add('active');
                } else if (tool === 'scale') {
                    document.getElementById('scaleTool').classList.add('active');
                }
                
                // Update transform gizmo visibility
                this.updateTransformGizmo();
                
                // Update sculpt overlay visibility
                if (tool === 'select' || tool === 'move' || tool === 'rotate' || tool === 'scale') {
                    this.sculptOverlay.classList.remove('active');
                } else {
                    this.sculptOverlay.classList.add('active');
                }
            }

            setSculptTool(tool) {
                this.sculptTool = tool;
                
                // Update button states
                document.querySelectorAll('.sculpt-tools .tool-button').forEach(button => {
                    button.classList.remove('active');
                });
                
                if (tool === 'push') {
                    document.getElementById('sculptPushTool').classList.add('active');
                } else if (tool === 'pull') {
                    document.getElementById('sculptPullTool').classList.add('active');
                } else if (tool === 'smooth') {
                    document.getElementById('sculptSmoothTool').classList.add('active');
                } else if (tool === 'ridge') {
                    document.getElementById('sculptRidgeTool').classList.add('active');
                } else if (tool === 'pinch') {
                    document.getElementById('sculptPinchTool').classList.add('active');
                } else if (tool === 'flatten') {
                    document.getElementById('sculptFlattenTool').classList.add('active');
                }
            }

            updateTransformGizmo() {
                const selectedObject = this.sceneManager.getSelectedObject();
                
                if (!selectedObject || this.currentTool === 'select') {
                    this.transformGizmo.style.display = 'none';
                    return;
                }
                
                // Calculate screen position of the object
                const vector = new THREE.Vector3();
                selectedObject.getWorldPosition(vector);
                vector.project(this.sceneManager.camera);
                
                const viewport = document.getElementById('viewport');
                const rect = viewport.getBoundingClientRect();
                const x = (vector.x * 0.5 + 0.5) * rect.width;
                const y = (-vector.y * 0.5 + 0.5) * rect.height;
                
                // Show transform gizmo
                this.transformGizmo.style.display = 'block';
                this.transformGizmo.style.left = `${x}px`;
                this.transformGizmo.style.top = `${y}px`;
                
                // Create transform handles based on current tool
                this.createTransformHandles(selectedObject, x, y);
            }

            createTransformHandles(object, x, y) {
                // Clear existing handles
                this.transformGizmo.innerHTML = '';
                
                if (this.currentTool === 'move') {
                    // Create move handles
                    this.createMoveHandles(object, x, y);
                } else if (this.currentTool === 'rotate') {
                    // Create rotate handles
                    this.createRotateHandles(object, x, y);
                } else if (this.currentTool === 'scale') {
                    // Create scale handles
                    this.createScaleHandles(object, x, y);
                }
            }

            createMoveHandles(object, x, y) {
                const handleSize = 12;
                const handleDistance = 50;
                
                // X-axis handle (red)
                const xHandle = document.createElement('div');
                xHandle.className = 'transform-handle x';
                xHandle.style.width = `${handleSize}px`;
                xHandle.style.height = `${handleSize}px`;
                xHandle.style.left = `${x + handleDistance}px`;
                xHandle.style.top = `${y - handleSize / 2}px`;
                xHandle.addEventListener('mousedown', (e) => this.startDrag(e, object, 'x'));
                this.transformGizmo.appendChild(xHandle);
                
                // Y-axis handle (green)
                const yHandle = document.createElement('div');
                yHandle.className = 'transform-handle y';
                yHandle.style.width = `${handleSize}px`;
                yHandle.style.height = `${handleSize}px`;
                yHandle.style.left = `${x - handleSize / 2}px`;
                yHandle.style.top = `${y - handleDistance}px`;
                yHandle.addEventListener('mousedown', (e) => this.startDrag(e, object, 'y'));
                this.transformGizmo.appendChild(yHandle);
                
                // Z-axis handle (blue)
                const zHandle = document.createElement('div');
                zHandle.className = 'transform-handle z';
                zHandle.style.width = `${handleSize}px`;
                zHandle.style.height = `${handleSize}px`;
                zHandle.style.left = `${x - handleSize / 2}px`;
                zHandle.style.top = `${y + handleDistance}px`;
                zHandle.addEventListener('mousedown', (e) => this.startDrag(e, object, 'z'));
                this.transformGizmo.appendChild(zHandle);
                
                // XY plane handle
                const xyHandle = document.createElement('div');
                xyHandle.className = 'transform-plane x';
                xyHandle.style.width = `${handleSize}px`;
                xyHandle.style.height = `${handleSize}px`;
                xyHandle.style.left = `${x + handleDistance / 2}px`;
                xyHandle.style.top = `${y - handleDistance / 2}px`;
                xyHandle.addEventListener('mousedown', (e) => this.startDrag(e, object, 'xy'));
                this.transformGizmo.appendChild(xyHandle);
                
                // XZ plane handle
                const xzHandle = document.createElement('div');
                xzHandle.className = 'transform-plane z';
                xzHandle.style.width = `${handleSize}px`;
                xzHandle.style.height = `${handleSize}px`;
                xzHandle.style.left = `${x + handleDistance / 2}px`;
                xzHandle.style.top = `${y + handleDistance / 2}px`;
                xzHandle.addEventListener('mousedown', (e) => this.startDrag(e, object, 'xz'));
                this.transformGizmo.appendChild(xzHandle);
                
                // YZ plane handle
                const yzHandle = document.createElement('div');
                yzHandle.className = 'transform-plane y';
                yzHandle.style.width = `${handleSize}px`;
                yzHandle.style.height = `${handleSize}px`;
                yzHandle.style.left = `${x - handleDistance / 2}px`;
                yzHandle.style.top = `${y - handleDistance / 2}px`;
                yzHandle.addEventListener('mousedown', (e) => this.startDrag(e, object, 'yz'));
                this.transformGizmo.appendChild(yzHandle);
                
                // XYZ handle
                const xyzHandle = document.createElement('div');
                xyzHandle.className = 'transform-handle xyz';
                xyzHandle.style.width = `${handleSize}px`;
                xyzHandle.style.height = `${handleSize}px`;
                xyzHandle.style.left = `${x - handleSize / 2}px`;
                xyzHandle.style.top = `${y - handleSize / 2}px`;
                xyzHandle.addEventListener('mousedown', (e) => this.startDrag(e, object, 'xyz'));
                this.transformGizmo.appendChild(xyzHandle);
            }

            createRotateHandles(object, x, y) {
                const handleSize = 12;
                const handleDistance = 50;
                
                // X-axis rotation handle
                const xHandle = document.createElement('div');
                xHandle.className = 'transform-handle x';
                xHandle.style.width = `${handleSize}px`;
                xHandle.style.height = `${handleSize}px`;
                xHandle.style.left = `${x + handleDistance}px`;
                xHandle.style.top = `${y - handleSize / 2}px`;
                xHandle.addEventListener('mousedown', (e) => this.startDrag(e, object, 'rotateX'));
                this.transformGizmo.appendChild(xHandle);
                
                // Y-axis rotation handle
                const yHandle = document.createElement('div');
                yHandle.className = 'transform-handle y';
                yHandle.style.width = `${handleSize}px`;
                yHandle.style.height = `${handleSize}px`;
                yHandle.style.left = `${x - handleSize / 2}px`;
                yHandle.style.top = `${y - handleDistance}px`;
                yHandle.addEventListener('mousedown', (e) => this.startDrag(e, object, 'rotateY'));
                this.transformGizmo.appendChild(yHandle);
                
                // Z-axis rotation handle
                const zHandle = document.createElement('div');
                zHandle.className = 'transform-handle z';
                zHandle.style.width = `${handleSize}px`;
                zHandle.style.height = `${handleSize}px`;
                zHandle.style.left = `${x - handleSize / 2}px`;
                zHandle.style.top = `${y + handleDistance}px`;
                zHandle.addEventListener('mousedown', (e) => this.startDrag(e, object, 'rotateZ'));
                this.transformGizmo.appendChild(zHandle);
            }

            createScaleHandles(object, x, y) {
                const handleSize = 12;
                const handleDistance = 50;
                
                // X-axis scale handle
                const xHandle = document.createElement('div');
                xHandle.className = 'transform-handle x';
                xHandle.style.width = `${handleSize}px`;
                xHandle.style.height = `${handleSize}px`;
                xHandle.style.left = `${x + handleDistance}px`;
                xHandle.style.top = `${y - handleSize / 2}px`;
                xHandle.addEventListener('mousedown', (e) => this.startDrag(e, object, 'scaleX'));
                this.transformGizmo.appendChild(xHandle);
                
                // Y-axis scale handle
                const yHandle = document.createElement('div');
                yHandle.className = 'transform-handle y';
                yHandle.style.width = `${handleSize}px`;
                yHandle.style.height = `${handleSize}px`;
                yHandle.style.left = `${x - handleSize / 2}px`;
                yHandle.style.top = `${y - handleDistance}px`;
                yHandle.addEventListener('mousedown', (e) => this.startDrag(e, object, 'scaleY'));
                this.transformGizmo.appendChild(yHandle);
                
                // Z-axis scale handle
                const zHandle = document.createElement('div');
                zHandle.className = 'transform-handle z';
                zHandle.style.width = `${handleSize}px`;
                zHandle.style.height = `${handleSize}px`;
                zHandle.style.left = `${x - handleSize / 2}px`;
                zHandle.style.top = `${y + handleDistance}px`;
                zHandle.addEventListener('mousedown', (e) => this.startDrag(e, object, 'scaleZ'));
                this.transformGizmo.appendChild(zHandle);
                
                // Uniform scale handle
                const uniformHandle = document.createElement('div');
                uniformHandle.className = 'transform-handle xyz';
                uniformHandle.style.width = `${handleSize}px`;
                uniformHandle.style.height = `${handleSize}px`;
                uniformHandle.style.left = `${x - handleSize / 2}px`;
                uniformHandle.style.top = `${y - handleSize / 2}px`;
                uniformHandle.addEventListener('mousedown', (e) => this.startDrag(e, object, 'scaleUniform'));
                this.transformGizmo.appendChild(uniformHandle);
            }

            updateLightHelper() {
                const selectedObject = this.sceneManager.getSelectedObject();
                
                if (!selectedObject || !selectedObject.isLight) {
                    this.lightHelper.style.display = 'none';
                    return;
                }
                
                // Calculate screen position of the light
                const vector = new THREE.Vector3();
                selectedObject.getWorldPosition(vector);
                vector.project(this.sceneManager.camera);
                
                const viewport = document.getElementById('viewport');
                const rect = viewport.getBoundingClientRect();
                const x = (vector.x * 0.5 + 0.5) * rect.width;
                const y = (-vector.y * 0.5 + 0.5) * rect.height;
                
                // Show light helper
                this.lightHelper.style.display = 'block';
                
                // Create light handle
                this.lightHelper.innerHTML = '';
                
                const handleSize = 16;
                const handle = document.createElement('div');
                handle.className = 'light-handle';
                handle.style.width = `${handleSize}px`;
                handle.style.height = `${handleSize}px`;
                handle.style.left = `${x - handleSize / 2}px`;
                handle.style.top = `${y - handleSize / 2}px`;
                handle.addEventListener('mousedown', (e) => this.startDrag(e, selectedObject, 'light'));
                this.lightHelper.appendChild(handle);
                
                // Create light direction line
                const lineLength = 100;
                const line = document.createElement('div');
                line.className = 'light-line';
                line.style.width = '2px';
                line.style.height = `${lineLength}px`;
                line.style.left = `${x - 1}px`;
                line.style.top = `${y}px`;
                line.style.transformOrigin = 'top center';
                
                // Calculate rotation based on light direction
                const direction = new THREE.Vector3();
                if (selectedObject.target) {
                    selectedObject.getWorldDirection(direction);
                } else {
                    direction.set(0, -1, 0);
                }
                
                const angle = Math.atan2(direction.x, -direction.y) * (180 / Math.PI);
                line.style.transform = `rotate(${angle}deg)`;
                
                this.lightHelper.appendChild(line);
            }

            startDrag(event, object, axis) {
                event.preventDefault();
                event.stopPropagation();
                
                this.isDragging = true;
                this.dragObject = object;
                this.dragAxis = axis;
                
                // Store initial position and values
                this.dragStart.set(event.clientX, event.clientY);
                this.dragStartPosition = object.position.clone();
                this.dragStartRotation = object.rotation.clone();
                this.dragStartScale = object.scale.clone();
                
                // Disable orbit controls while dragging
                this.sceneManager.controls.enabled = false;
            }

            onMouseDown(event) {
                // Handle sculpting
                if (this.sculptOverlay.classList.contains('active')) {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    
                    if (selectedObject && selectedObject.isMesh) {
                        this.isSculpting = true;
                        this.startSculpting(event, selectedObject);
                    }
                }
            }

            onMouseMove(event) {
                // Handle dragging
                if (this.isDragging && this.dragObject) {
                    this.handleDrag(event);
                }
                
                // Handle sculpting
                if (this.isSculpting) {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    
                    if (selectedObject && selectedObject.isMesh) {
                        this.handleSculpting(event, selectedObject);
                    }
                }
                
                // Update transform gizmo
                this.updateTransformGizmo();
                
                // Update light helper
                this.updateLightHelper();
                
                // Update sculpt cursor
                if (this.sculptOverlay.classList.contains('active')) {
                    const viewport = document.getElementById('viewport');
                    const rect = viewport.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const y = event.clientY - rect.top;
                    
                    this.sculptCursor.style.left = `${x - this.sculptSize * 25}px`;
                    this.sculptCursor.style.top = `${y - this.sculptSize * 25}px`;
                    this.sculptCursor.style.width = `${this.sculptSize * 50}px`;
                    this.sculptCursor.style.height = `${this.sculptSize * 50}px`;
                }
            }

            onMouseUp(event) {
                // Handle dragging
                if (this.isDragging) {
                    this.isDragging = false;
                    this.dragObject = null;
                    
                    // Re-enable orbit controls
                    this.sceneManager.controls.enabled = true;
                    
                    // Update properties panel
                    this.uiManager.updateProperties();
                }
                
                // Handle sculpting
                if (this.isSculpting) {
                    this.isSculpting = false;
                    this.finishSculpting();
                }
            }

            onTouchStart(event) {
                if (event.touches.length === 1) {
                    const touch = event.touches[0];
                    const mouseEvent = new MouseEvent('mousedown', {
                                                clientX: touch.clientX,
                        clientY: touch.clientY
                    });
                    this.onMouseDown(mouseEvent);
                }
            }
            
            onTouchMove(event) {
                if (event.touches.length === 1) {
                    const touch = event.touches[0];
                    const mouseEvent = new MouseEvent('mousemove', {
                        clientX: touch.clientX,
                        clientY: touch.clientY
                    });
                    this.onMouseMove(mouseEvent);
                }
            }
            
            onTouchEnd(event) {
                const mouseEvent = new MouseEvent('mouseup', {});
                this.onMouseUp(mouseEvent);
            }
            
            handleDrag(event) {
                if (!this.isDragging || !this.dragObject) return;
                
                const dx = event.clientX - this.dragStart.x;
                const dy = event.clientY - this.dragStart.y;
                
                // Calculate movement based on the axis
                if (this.dragAxis === 'x') {
                    this.dragObject.position.x = this.dragStartPosition.x + dx * 0.01;
                } else if (this.dragAxis === 'y') {
                    this.dragObject.position.y = this.dragStartPosition.y - dy * 0.01;
                } else if (this.dragAxis === 'z') {
                    this.dragObject.position.z = this.dragStartPosition.z + dy * 0.01;
                } else if (this.dragAxis === 'rotateX') {
                    this.dragObject.rotation.x = this.dragStartRotation.x + dy * 0.01;
                } else if (this.dragAxis === 'rotateY') {
                    this.dragObject.rotation.y = this.dragStartRotation.y + dx * 0.01;
                } else if (this.dragAxis === 'rotateZ') {
                    this.dragObject.rotation.z = this.dragStartRotation.z + dx * 0.01;
                } else if (this.dragAxis === 'scaleX') {
                    this.dragObject.scale.x = Math.max(0.1, this.dragStartScale.x + dx * 0.01);
                } else if (this.dragAxis === 'scaleY') {
                    this.dragObject.scale.y = Math.max(0.1, this.dragStartScale.y + dy * 0.01);
                } else if (this.dragAxis === 'scaleZ') {
                    this.dragObject.scale.z = Math.max(0.1, this.dragStartScale.z + dy * 0.01);
                } else if (this.dragAxis === 'scaleUniform') {
                    const scale = Math.max(0.1, this.dragStartScale.x + dx * 0.01);
                    this.dragObject.scale.set(scale, scale, scale);
                } else if (this.dragAxis === 'light') {
                    // Move light based on drag
                    this.dragObject.position.x = this.dragStartPosition.x + dx * 0.01;
                    this.dragObject.position.y = this.dragStartPosition.y - dy * 0.01;
                }
                
                // Update properties panel
                this.uiManager.updateProperties();
            }
            
            startSculpting(event, object) {
                if (!object.isMesh) return;
                
                this.isSculpting = true;
                
                // Store original vertices
                const geometry = object.geometry;
                if (!geometry.attributes.position) return;
                
                this.originalVertices = geometry.attributes.position.array.slice();
                this.modifiedVertices = geometry.attributes.position.array.slice();
                
                // Store original normals
                if (geometry.attributes.normal) {
                    this.originalNormals = geometry.attributes.normal.array.slice();
                }
            }
            
            handleSculpting(event, object) {
                if (!this.isSculpting || !object.isMesh) return;
                
                const geometry = object.geometry;
                if (!geometry.attributes.position) return;
                
                // Get mouse position in normalized device coordinates
                const viewport = document.getElementById('viewport');
                const rect = viewport.getBoundingClientRect();
                const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                
                // Raycast to find intersection with object
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(new THREE.Vector2(x, y), this.sceneManager.camera);
                
                const intersects = raycaster.intersectObject(object);
                if (intersects.length === 0) return;
                
                const point = intersects[0].point;
                const face = intersects[0].face;
                
                // Get face normal in world space
                const normal = new THREE.Vector3();
                normal.copy(face.normal);
                normal.transformDirection(object.matrixWorld);
                
                // Get vertices and apply sculpting
                const positions = geometry.attributes.position.array;
                const vertex = new THREE.Vector3();
                
                for (let i = 0; i < positions.length; i += 3) {
                    vertex.set(positions[i], positions[i + 1], positions[i + 2]);
                    vertex.applyMatrix4(object.matrixWorld);
                    
                    const distance = vertex.distanceTo(point);
                    
                    if (distance < this.sculptSize) {
                        const influence = 1 - (distance / this.sculptSize);
                        const strength = this.sculptStrength * influence * 0.1;
                        
                        // Apply sculpting based on tool
                        if (this.sculptTool === 'push') {
                            vertex.sub(normal.clone().multiplyScalar(strength));
                        } else if (this.sculptTool === 'pull') {
                            vertex.add(normal.clone().multiplyScalar(strength));
                        } else if (this.sculptTool === 'smooth') {
                            // Smooth by averaging with neighbors
                            const neighbors = this.getVertexNeighbors(geometry, i / 3);
                            const avgPosition = new THREE.Vector3();
                            
                            neighbors.forEach(neighborIndex => {
                                const ni = neighborIndex * 3;
                                avgPosition.x += this.originalVertices[ni];
                                avgPosition.y += this.originalVertices[ni + 1];
                                avgPosition.z += this.originalVertices[ni + 2];
                            });
                            
                            avgPosition.divideScalar(neighbors.length);
                            
                            // Convert to world space
                            avgPosition.applyMatrix4(object.matrixWorld);
                            
                            // Move toward average position
                            vertex.lerp(avgPosition, strength * 0.5);
                        } else if (this.sculptTool === 'ridge') {
                            // Create a ridge by moving vertices away from the center
                            const direction = vertex.clone().sub(point).normalize();
                            vertex.add(direction.multiplyScalar(strength));
                        } else if (this.sculptTool === 'pinch') {
                            // Pinch by moving vertices toward the center
                            const direction = vertex.clone().sub(point).normalize();
                            vertex.sub(direction.multiplyScalar(strength));
                        } else if (this.sculptTool === 'flatten') {
                            // Flatten by moving vertices toward a plane
                            const planePoint = point.clone();
                            const planeNormal = normal.clone();
                            const distanceToPlane = vertex.clone().sub(planePoint).dot(planeNormal);
                            vertex.sub(planeNormal.clone().multiplyScalar(distanceToPlane * strength));
                        }
                        
                        // Convert back to local space
                        vertex.applyMatrix4(new THREE.Matrix4().getInverse(object.matrixWorld));
                        
                        // Update vertex position
                        positions[i] = vertex.x;
                        positions[i + 1] = vertex.y;
                        positions[i + 2] = vertex.z;
                    }
                }
                
                // Update geometry
                geometry.attributes.position.needsUpdate = true;
                geometry.computeVertexNormals();
            }
            
            getVertexNeighbors(geometry, vertexIndex) {
                const neighbors = [];
                const positionAttribute = geometry.attributes.position;
                
                // This is a simplified approach - in a real implementation, 
                // you would use the index buffer to find connected vertices
                for (let i = 0; i < positionAttribute.count; i++) {
                    if (i !== vertexIndex) {
                        const v1 = new THREE.Vector3().fromBufferAttribute(positionAttribute, vertexIndex);
                        const v2 = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
                        
                        // If vertices are close enough, consider them neighbors
                        if (v1.distanceTo(v2) < 0.5) {
                            neighbors.push(i);
                        }
                    }
                }
                
                return neighbors;
            }
            
            finishSculpting() {
                this.isSculpting = false;
                this.originalVertices = null;
                this.modifiedVertices = null;
                this.originalNormals = null;
            }
            
            update() {
                // Update transform gizmo and light helper positions
                this.updateTransformGizmo();
                this.updateLightHelper();
            }
        }

        /**
         * UI Manager - Handles all UI-related operations
         */
        class UIManager {
            constructor(animationEngine, sceneManager, animationManager, physicsManager) {
                this.animationEngine = animationEngine;
                this.sceneManager = sceneManager;
                this.animationManager = animationManager;
                this.physicsManager = physicsManager;
                this.toolboxVisible = true;
                this.activePanel = 'objects';
            }

            init() {
                // Set up event listeners
                this.setupEventListeners();
                
                // Initialize hierarchy
                this.updateHierarchy();
                
                // Initialize properties panel
                this.updateProperties();
                
                // Initialize animations panel
                this.updateAnimations();
                
                // Initialize timeline
                this.updateTimeline();
                
                // Initialize toolbox toggle
                this.updateToolboxToggle();
            }

            setupEventListeners() {
                // Toolbox toggle
                document.getElementById('toolboxToggle').addEventListener('click', () => {
                    this.toggleToolbox();
                });
                
                // Navigation items
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const panel = item.dataset.panel;
                        this.showPanel(panel);
                    });
                });
                
                // Tool panel close buttons
                document.querySelectorAll('.tool-panel-close').forEach(button => {
                    button.addEventListener('click', () => {
                        const panel = button.dataset.panel;
                        this.hidePanel(panel);
                    });
                });
                
                // Object creation buttons
                document.getElementById('addCube').addEventListener('click', () => {
                    const object = this.sceneManager.createCube();
                    this.sceneManager.selectObject(object);
                    this.updateHierarchy();
                    this.updateProperties();
                });
                
                document.getElementById('addSphere').addEventListener('click', () => {
                    const object = this.sceneManager.createSphere();
                    this.sceneManager.selectObject(object);
                    this.updateHierarchy();
                    this.updateProperties();
                });
                
                document.getElementById('addCylinder').addEventListener('click', () => {
                    const object = this.sceneManager.createCylinder();
                    this.sceneManager.selectObject(object);
                    this.updateHierarchy();
                    this.updateProperties();
                });
                
                document.getElementById('addCone').addEventListener('click', () => {
                    const object = this.sceneManager.createCone();
                    this.sceneManager.selectObject(object);
                    this.updateHierarchy();
                    this.updateProperties();
                });
                
                document.getElementById('addTorus').addEventListener('click', () => {
                    const object = this.sceneManager.createTorus();
                    this.sceneManager.selectObject(object);
                    this.updateHierarchy();
                    this.updateProperties();
                });
                
                document.getElementById('addTetrahedron').addEventListener('click', () => {
                    const object = this.sceneManager.createTetrahedron();
                    this.sceneManager.selectObject(object);
                    this.updateHierarchy();
                    this.updateProperties();
                });
                
                // Light creation buttons
                document.getElementById('addPointLight').addEventListener('click', (e) => {
                    e.preventDefault();
                    const light = this.sceneManager.createLight('point');
                    this.sceneManager.selectObject(light);
                    this.updateHierarchy();
                    this.updateProperties();
                });
                
                document.getElementById('addSpotLight').addEventListener('click', (e) => {
                    e.preventDefault();
                    const light = this.sceneManager.createLight('spot');
                    this.sceneManager.selectObject(light);
                    this.updateHierarchy();
                    this.updateProperties();
                });
                
                document.getElementById('addDirectionalLight').addEventListener('click', (e) => {
                    e.preventDefault();
                    const light = this.sceneManager.createLight('directional');
                    this.sceneManager.selectObject(light);
                    this.updateHierarchy();
                    this.updateProperties();
                });
                
                document.getElementById('addAmbientLight').addEventListener('click', (e) => {
                    e.preventDefault();
                    const light = this.sceneManager.createLight('ambient');
                    this.sceneManager.selectObject(light);
                    this.updateHierarchy();
                    this.updateProperties();
                });
                
                // Group creation button
                document.getElementById('addGroup').addEventListener('click', () => {
                    const group = this.sceneManager.createGroup();
                    this.sceneManager.selectObject(group);
                    this.updateHierarchy();
                    this.updateProperties();
                });
                
                // Model import button
                document.getElementById('importModel').addEventListener('click', () => {
                    document.getElementById('modelFileInput').click();
                });
                
                document.getElementById('modelFileInput').addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        this.sceneManager.importModel(file, (success, model) => {
                            if (success) {
                                this.sceneManager.selectObject(model);
                                this.updateHierarchy();
                                this.updateProperties();
                                this.showNotification('Model imported successfully', 'success');
                            } else {
                                this.showNotification('Failed to import model', 'error');
                            }
                        });
                    }
                });
                
                // Delete object button
                document.getElementById('deleteObject').addEventListener('click', () => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        this.sceneManager.removeObject(selectedObject);
                        this.updateHierarchy();
                        this.updateProperties();
                    }
                });
                
                // Property inputs
                document.getElementById('propName').addEventListener('input', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        selectedObject.name = e.target.value;
                        this.updateHierarchy();
                    }
                });
                
                document.getElementById('propPosX').addEventListener('input', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        selectedObject.position.x = parseFloat(e.target.value);
                    }
                });
                
                document.getElementById('propPosY').addEventListener('input', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        selectedObject.position.y = parseFloat(e.target.value);
                    }
                });
                
                document.getElementById('propPosZ').addEventListener('input', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        selectedObject.position.z = parseFloat(e.target.value);
                    }
                });
                
                document.getElementById('propRotX').addEventListener('input', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        selectedObject.rotation.x = parseFloat(e.target.value);
                    }
                });
                
                document.getElementById('propRotY').addEventListener('input', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        selectedObject.rotation.y = parseFloat(e.target.value);
                    }
                });
                
                document.getElementById('propRotZ').addEventListener('input', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        selectedObject.rotation.z = parseFloat(e.target.value);
                    }
                });
                
                document.getElementById('propScaleX').addEventListener('input', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        selectedObject.scale.x = parseFloat(e.target.value);
                    }
                });
                
                document.getElementById('propScaleY').addEventListener('input', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        selectedObject.scale.y = parseFloat(e.target.value);
                    }
                });
                
                document.getElementById('propScaleZ').addEventListener('input', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        selectedObject.scale.z = parseFloat(e.target.value);
                    }
                });
                
                document.getElementById('propColor').addEventListener('input', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject && selectedObject.material) {
                        selectedObject.material.color.set(e.target.value);
                    }
                });
                
                // Physics properties
                document.getElementById('physicsEnabled').addEventListener('change', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        const uuid = selectedObject.uuid;
                        const properties = this.sceneManager.getObjectProperties(uuid);
                        properties.physicsEnabled = e.target.checked;
                        this.sceneManager.setObjectProperties(uuid, properties);
                        
                        if (e.target.checked) {
                            this.physicsManager.addObject(selectedObject, properties);
                        } else {
                            this.physicsManager.removeObject(selectedObject);
                        }
                        
                        document.getElementById('physicsProperties').classList.toggle('active', e.target.checked);
                    }
                });
                
                document.getElementById('propMass').addEventListener('input', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        const uuid = selectedObject.uuid;
                        const properties = this.sceneManager.getObjectProperties(uuid);
                        properties.mass = parseFloat(e.target.value);
                        this.sceneManager.setObjectProperties(uuid, properties);
                        this.physicsManager.updateObjectProperties(selectedObject, properties);
                    }
                });
                
                document.getElementById('propFriction').addEventListener('input', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        const uuid = selectedObject.uuid;
                        const properties = this.sceneManager.getObjectProperties(uuid);
                        properties.friction = parseFloat(e.target.value);
                        this.sceneManager.setObjectProperties(uuid, properties);
                        this.physicsManager.updateObjectProperties(selectedObject, properties);
                    }
                });
                
                document.getElementById('propRestitution').addEventListener('input', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        const uuid = selectedObject.uuid;
                        const properties = this.sceneManager.getObjectProperties(uuid);
                        properties.restitution = parseFloat(e.target.value);
                        this.sceneManager.setObjectProperties(uuid, properties);
                        this.physicsManager.updateObjectProperties(selectedObject, properties);
                    }
                });
                
                document.getElementById('propStatic').addEventListener('change', (e) => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject) {
                        const uuid = selectedObject.uuid;
                        const properties = this.sceneManager.getObjectProperties(uuid);
                        properties.isStatic = e.target.checked;
                        this.sceneManager.setObjectProperties(uuid, properties);
                        this.physicsManager.updateObjectProperties(selectedObject, properties);
                    }
                });
                
                // Animation controls
                document.getElementById('playBtn').addEventListener('click', () => {
                    this.animationManager.play();
                });
                
                document.getElementById('pauseBtn').addEventListener('click', () => {
                    this.animationManager.pause();
                });
                
                document.getElementById('stopBtn').addEventListener('click', () => {
                    this.animationManager.stop();
                });
                
                document.getElementById('addKeyframeBtn').addEventListener('click', () => {
                    const selectedObject = this.sceneManager.getSelectedObject();
                    if (selectedObject && this.animationManager.getSelectedAnimation()) {
                        const time = this.animationManager.currentTime;
                        const properties = {
                            position: [
                                selectedObject.position.x,
                                selectedObject.position.y,
                                selectedObject.position.z
                            ],
                            rotation: [
                                selectedObject.rotation.x,
                                selectedObject.rotation.y,
                                selectedObject.rotation.z
                            ],
                            scale: [
                                selectedObject.scale.x,
                                selectedObject.scale.y,
                                selectedObject.scale.z
                            ]
                        };
                        
                        if (selectedObject.material) {
                            properties.color = selectedObject.material.color.getHex();
                        }
                        
                        this.animationManager.addKeyframe(selectedObject, time, properties);
                        this.updateTimeline();
                    }
                });
                
                // Animation creation
                document.getElementById('addAnimation').addEventListener('click', () => {
                    document.getElementById('animationModal').style.display = 'flex';
                });
                
                document.getElementById('cancelAnimation').addEventListener('click', () => {
                    document.getElementById('animationModal').style.display = 'none';
                });
                
                document.getElementById('createAnimation').addEventListener('click', () => {
                    const name = document.getElementById('animationName').value;
                    const duration = parseFloat(document.getElementById('animationDuration').value);
                    const loop = document.getElementById('animationLoop').value;
                    
                    if (name && duration > 0) {
                        this.animationManager.createAnimation(name, duration, loop);
                        this.updateAnimations();
                        this.updateTimeline();
                        document.getElementById('animationModal').style.display = 'none';
                    }
                });
                
                // Animation deletion
                document.getElementById('deleteAnimation').addEventListener('click', () => {
                    if (this.animationManager.getSelectedAnimation()) {
                        const name = this.animationManager.getSelectedAnimation().name;
                        this.animationManager.deleteAnimation(name);
                        this.updateAnimations();
                        this.updateTimeline();
                    }
                });
                
                // Animation duplication
                document.getElementById('duplicateAnimation').addEventListener('click', () => {
                    if (this.animationManager.getSelectedAnimation()) {
                        const name = this.animationManager.getSelectedAnimation().name;
                        const newName = `${name}_copy`;
                        this.animationManager.duplicateAnimation(name, newName);
                        this.updateAnimations();
                        this.updateTimeline();
                    }
                });
                
                // Curve editing
                document.getElementById('editCurve').addEventListener('click', () => {
                    document.getElementById('curveModal').style.display = 'flex';
                });
                
                document.getElementById('cancelCurve').addEventListener('click', () => {
                    document.getElementById('curveModal').style.display = 'none';
                });
                
                document.getElementById('saveCurve').addEventListener('click', () => {
                    // Save curve logic would go here
                    document.getElementById('curveModal').style.display = 'none';
                });
                
                // Tab switching in curve editor
                document.querySelectorAll('.tab').forEach(tab => {
                    tab.addEventListener('click', () => {
                        const tabName = tab.dataset.tab;
                        
                        // Update active tab
                        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                        tab.classList.add('active');
                        
                        // Update active tab content
                        document.querySelectorAll('.tab-content').forEach(content => {
                            content.classList.remove('active');
                        });
                        document.getElementById(`${tabName}-tab`).classList.add('active');
                    });
                });
                
                // Physics toggle
                document.getElementById('physicsToggleBtn').addEventListener('click', () => {
                    const enabled = this.physicsManager.toggle();
                    document.getElementById('physicsToggleBtn').textContent = `Physics: ${enabled ? 'On' : 'Off'}`;
                });
                
                // Export/Import
                document.getElementById('exportScene').addEventListener('click', () => {
                    const sceneData = this.sceneManager.exportScene();
                    const blob = new Blob([sceneData], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'scene.json';
                    a.click();
                    URL.revokeObjectURL(url);
                });
                
                document.getElementById('importScene').addEventListener('click', () => {
                    document.getElementById('fileInput').click();
                });
                
                document.getElementById('fileInput').addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const success = this.sceneManager.importScene(event.target.result);
                            if (success) {
                                this.updateHierarchy();
                                this.updateProperties();
                                this.showNotification('Scene imported successfully', 'success');
                            } else {
                                this.showNotification('Failed to import scene', 'error');
                            }
                        };
                        reader.readAsText(file);
                    }
                });
                
                document.getElementById('exportAnimation').addEventListener('click', () => {
                    if (this.animationManager.getSelectedAnimation()) {
                        const name = this.animationManager.getSelectedAnimation().name;
                        const animationData = this.animationManager.exportAnimation(name);
                        if (animationData) {
                            const blob = new Blob([animationData], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${name}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                        }
                    }
                });
                
                document.getElementById('importAnimation').addEventListener('click', () => {
                    document.getElementById('fileInput').click();
                });
                
                // Context menu
                document.getElementById('contextMenu').addEventListener('click', (e) => {
                    const action = e.target.dataset.action;
                    if (action) {
                        this.handleContextMenuAction(action);
                    }
                    document.getElementById('contextMenu').style.display = 'none';
                });
                
                // Hide context menu on click outside
                document.addEventListener('click', () => {
                    document.getElementById('contextMenu').style.display = 'none';
                });
            }

            toggleToolbox() {
                this.toolboxVisible = !this.toolboxVisible;
                document.body.classList.toggle('toolbox-hidden', !this.toolboxVisible);
            }

            showPanel(panelName) {
                // Hide all panels
                document.querySelectorAll('.tool-panel').forEach(panel => {
                    panel.classList.remove('active');
                });
                
                // Show selected panel
                const panel = document.getElementById(`${panelName}Panel`);
                if (panel) {
                    panel.classList.add('active');
                }
                
                // Update active nav item
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                const activeNavItem = document.querySelector(`.nav-item[data-panel="${panelName}"]`);
                if (activeNavItem) {
                    activeNavItem.classList.add('active');
                }
                
                this.activePanel = panelName;
            }

            hidePanel(panelName) {
                const panel = document.getElementById(`${panelName}Panel`);
                if (panel) {
                    panel.classList.remove('active');
                }
                
                // Update active nav item
                const activeNavItem = document.querySelector(`.nav-item[data-panel="${panelName}"]`);
                if (activeNavItem) {
                    activeNavItem.classList.remove('active');
                }
            }

            updateHierarchy() {
                const hierarchy = document.getElementById('hierarchy');
                hierarchy.innerHTML = '';
                
                // Add objects to hierarchy
                this.sceneManager.getAllObjects().forEach(object => {
                    const item = document.createElement('div');
                    item.className = 'hierarchy-item';
                    
                    if (this.sceneManager.getSelectedObject() === object) {
                        item.classList.add('selected');
                    }
                    
                    // Add icon based on object type
                    const icon = document.createElement('span');
                    icon.className = 'icon';
                    
                    if (object.isLight) {
                        icon.innerHTML = '💡';
                    } else if (object.type === 'Group') {
                        icon.innerHTML = '📁';
                    } else if (object.isMesh) {
                        icon.innerHTML = '🔷';
                    } else {
                        icon.innerHTML = '📦';
                    }
                    
                    item.appendChild(icon);
                    
                    // Add name
                    const name = document.createElement('span');
                    name.textContent = object.name;
                    item.appendChild(name);
                    
                    // Add visibility toggle
                    const visibility = document.createElement('span');
                    visibility.className = 'object-visibility';
                    visibility.innerHTML = this.sceneManager.getObjectProperties(object.uuid).visible ? '👁️' : '🚫';
                    visibility.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const visible = this.sceneManager.toggleObjectVisibility(object);
                        visibility.innerHTML = visible ? '👁️' : '🚫';
                    });
                    item.appendChild(visibility);
                    
                    // Add lock toggle
                    const lock = document.createElement('span');
                    lock.className = 'object-locked';
                    if (this.sceneManager.getObjectProperties(object.uuid).locked) {
                        lock.classList.add('active');
                    }
                    lock.innerHTML = '🔒';
                    lock.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const locked = this.sceneManager.toggleObjectLock(object);
                        lock.classList.toggle('active', locked);
                    });
                    item.appendChild(lock);
                    
                    // Add click event to select object
                    item.addEventListener('click', () => {
                        this.sceneManager.selectObject(object);
                        this.updateHierarchy();
                        this.updateProperties();
                    });
                    
                    // Add context menu event
                    item.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        this.showContextMenu(e.clientX, e.clientY, object);
                    });
                    
                    hierarchy.appendChild(item);
                });
            }

            updateProperties() {
                const selectedObject = this.sceneManager.getSelectedObject();
                
                if (!selectedObject) {
                    // Clear properties
                    document.getElementById('propName').value = '';
                    document.getElementById('propPosX').value = '';
                    document.getElementById('propPosY').value = '';
                    document.getElementById('propPosZ').value = '';
                    document.getElementById('propRotX').value = '';
                    document.getElementById('propRotY').value = '';
                    document.getElementById('propRotZ').value = '';
                    document.getElementById('propScaleX').value = '';
                    document.getElementById('propScaleY').value = '';
                    document.getElementById('propScaleZ').value = '';
                    document.getElementById('propColor').value = '#4fc3f7';
                    
                    // Disable physics properties
                    document.getElementById('physicsEnabled').checked = false;
                    document.getElementById('physicsProperties').classList.remove('active');
                    
                    return;
                }
                
                // Update properties
                document.getElementById('propName').value = selectedObject.name || '';
                document.getElementById('propPosX').value = selectedObject.position.x.toFixed(2);
                document.getElementById('propPosY').value = selectedObject.position.y.toFixed(2);
                document.getElementById('propPosZ').value = selectedObject.position.z.toFixed(2);
                document.getElementById('propRotX').value = selectedObject.rotation.x.toFixed(2);
                document.getElementById('propRotY').value = selectedObject.rotation.y.toFixed(2);
                document.getElementById('propRotZ').value = selectedObject.rotation.z.toFixed(2);
                document.getElementById('propScaleX').value = selectedObject.scale.x.toFixed(2);
                document.getElementById('propScaleY').value = selectedObject.scale.y.toFixed(2);
                document.getElementById('propScaleZ').value = selectedObject.scale.z.toFixed(2);
                
                // Update color if available
                if (selectedObject.material && selectedObject.material.color) {
                    const color = '#' + selectedObject.material.color.getHexString();
                    document.getElementById('propColor').value = color;
                }
                
                // Update physics properties
                const properties = this.sceneManager.getObjectProperties(selectedObject.uuid);
                document.getElementById('physicsEnabled').checked = properties.physicsEnabled || false;
                document.getElementById('physicsProperties').classList.toggle('active', properties.physicsEnabled);
                
                document.getElementById('propMass').value = properties.mass || 1;
                document.getElementById('propFriction').value = properties.friction || 0.5;
                document.getElementById('propRestitution').value = properties.restitution || 0.3;
                document.getElementById('propStatic').checked = properties.isStatic || false;
            }

            updateAnimations() {
                const animations = document.getElementById('animations');
                animations.innerHTML = '';
                
                this.animationManager.getAllAnimations().forEach(animation => {
                    const item = document.createElement('div');
                    item.className = 'animation-item';
                    
                    if (this.animationManager.getSelectedAnimation() === animation) {
                        item.classList.add('selected');
                    }
                    
                    // Add name
                    const name = document.createElement('span');
                    name.textContent = animation.name;
                    item.appendChild(name);
                    
                    // Add buttons
                    const buttons = document.createElement('div');
                    buttons.className = 'animation-item-buttons';
                    
                    const selectBtn = document.createElement('button');
                    selectBtn.className = 'button secondary';
                    selectBtn.textContent = 'Select';
                    selectBtn.addEventListener('click', () => {
                        this.animationManager.selectAnimation(animation.name);
                        this.updateAnimations();
                        this.updateTimeline();
                    });
                    buttons.appendChild(selectBtn);
                    
                    item.appendChild(buttons);
                    
                    animations.appendChild(item);
                });
            }

            updateTimeline() {
                const timelineTracks = document.getElementById('timelineTracks');
                timelineTracks.innerHTML = '';
                
                if (!this.animationManager.getSelectedAnimation()) {
                    return;
                }
                
                const animation = this.animationManager.getSelectedAnimation();
                
                // Add tracks for each object with keyframes
                animation.keyframes.forEach((keyframes, uuid) => {
                    const object = this.sceneManager.getObjectByUUID(uuid);
                    if (!object) return;
                    
                    const track = document.createElement('div');
                    track.className = 'timeline-track';
                    
                    // Add track header
                    const header = document.createElement('div');
                    header.className = 'timeline-track-header';
                    header.textContent = object.name;
                    track.appendChild(header);
                    
                    // Add track content
                    const content = document.createElement('div');
                    content.className = 'timeline-track-content';
                    
                    // Add keyframes
                    keyframes.forEach(keyframe => {
                        const keyframeElement = document.createElement('div');
                        keyframeElement.className = 'timeline-keyframe';
                        keyframeElement.style.left = `${(keyframe.time / animation.duration) * 100}%`;
                        
                        keyframeElement.addEventListener('click', () => {
                            this.animationManager.setCurrentTime(keyframe.time);
                            this.updateTimelinePlayhead();
                        });
                        
                        content.appendChild(keyframeElement);
                    });
                    
                    track.appendChild(content);
                    timelineTracks.appendChild(track);
                });
                
                // Update playhead position
                this.updateTimelinePlayhead();
            }

            updateTimelinePlayhead() {
                const playhead = document.getElementById('timelinePlayhead');
                const animation = this.animationManager.getSelectedAnimation();
                
                if (animation) {
                    const position = (this.animationManager.currentTime / animation.duration) * 100;
                    playhead.style.left = `${position}%`;
                } else {
                    playhead.style.left = '0%';
                }
                
                // Update time display
                document.getElementById('timelineTime').textContent = `${this.animationManager.currentTime.toFixed(2)}s`;
            }

            updateToolboxToggle() {
                const toggle = document.getElementById('toolboxToggle');
                toggle.innerHTML = this.toolboxVisible ? 
                    '<svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>' :
                    '<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>';
            }

            showContextMenu(x, y, object) {
                const contextMenu = document.getElementById('contextMenu');
                contextMenu.style.left = `${x}px`;
                contextMenu.style.top = `${y}px`;
                contextMenu.style.display = 'block';
                
                // Store the object for context menu actions
                this.contextMenuObject = object;
            }

            handleContextMenuAction(action) {
                if (!this.contextMenuObject) return;
                
                switch (action) {
                    case 'rename':
                        const newName = prompt('Enter new name:', this.contextMenuObject.name);
                        if (newName) {
                            this.contextMenuObject.name = newName;
                            this.updateHierarchy();
                        }
                        break;
                    case 'duplicate':
                        // Clone the object
                        const clone = this.contextMenuObject.clone();
                        this.sceneManager.addObject(clone, `${this.contextMenuObject.name}_copy`);
                        this.updateHierarchy();
                        break;
                    case 'delete':
                        this.sceneManager.removeObject(this.contextMenuObject);
                        this.updateHierarchy();
                        this.updateProperties();
                        break;
                    case 'toggleVisibility':
                        this.sceneManager.toggleObjectVisibility(this.contextMenuObject);
                        this.updateHierarchy();
                        break;
                    case 'toggleLock':
                        this.sceneManager.toggleObjectLock(this.contextMenuObject);
                        this.updateHierarchy();
                        break;
                }
            }

            showNotification(message, type = 'info') {
                const notification = document.getElementById('notification');
                notification.textContent = message;
                notification.className = `notification ${type}`;
                notification.classList.add('show');
                
                setTimeout(() => {
                    notification.classList.remove('show');
                }, 3000);
            }

            update() {
                // Update timeline playhead
                this.updateTimelinePlayhead();
            }
        }

        /**
         * Media Manager - Handles audio and media operations
         */
        class MediaManager {
            constructor(sceneManager, animationManager) {
                this.sceneManager = sceneManager;
                this.animationManager = animationManager;
                this.audioContext = null;
                this.backgroundMusic = null;
                this.soundEffects = [];
                this.voiceOver = null;
                this.mediaRecorder = null;
                this.recordedChunks = [];
            }

            init() {
                // Set up event listeners for media controls
                this.setupEventListeners();
                
                // Initialize audio context
                try {
                    window.AudioContext = window.AudioContext || window.webkitAudioContext;
                    this.audioContext = new AudioContext();
                } catch (e) {
                    console.error('Web Audio API is not supported in this browser');
                }
            }

            setupEventListeners() {
                // Background music
                document.getElementById('selectBgMusic').addEventListener('click', () => {
                    document.getElementById('bgMusicFile').click();
                });
                
                document.getElementById('bgMusicFile').addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        this.loadBackgroundMusic(file);
                    }
                });
                
                // Sound effects
                document.getElementById('selectSfx').addEventListener('click', () => {
                    document.getElementById('sfxFile').click();
                });
                
                document.getElementById('sfxFile').addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        this.loadSoundEffect(file);
                    }
                });
                
                // Voice over
                document.getElementById('selectVoice').addEventListener('click', () => {
                    document.getElementById('voiceFile').click();
                });
                
                document.getElementById('voiceFile').addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        this.loadVoiceOver(file);
                    }
                });
                
                // Voice recording
                document.getElementById('recordVoice').addEventListener('click', () => {
                    this.startRecording();
                });
                
                document.getElementById('stopRecordVoice').addEventListener('click', () => {
                    this.stopRecording();
                });
                
                // Scene transitions
                document.querySelectorAll('[data-transition]').forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.preventDefault();
                        const transition = e.target.dataset.transition;
                        this.applySceneTransition(transition);
                    });
                });
            }

            loadBackgroundMusic(file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (this.audioContext) {
                        this.audioContext.decodeAudioData(e.target.result, (buffer) => {
                            this.backgroundMusic = buffer;
                            document.getElementById('bgMusicInput').value = file.name;
                        }, (error) => {
                            console.error('Error decoding audio data:', error);
                        });
                    }
                };
                reader.readAsArrayBuffer(file);
            }

            loadSoundEffect(file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (this.audioContext) {
                        this.audioContext.decodeAudioData(e.target.result, (buffer) => {
                            this.soundEffects.push({
                                name: file.name,
                                buffer: buffer
                            });
                            document.getElementById('sfxInput').value = file.name;
                        }, (error) => {
                            console.error('Error decoding audio data:', error);
                        });
                    }
                };
                reader.readAsArrayBuffer(file);
            }

            loadVoiceOver(file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (this.audioContext) {
                        this.audioContext.decodeAudioData(e.target.result, (buffer) => {
                            this.voiceOver = buffer;
                            document.getElementById('voiceInput').value = file.name;
                        }, (error) => {
                            console.error('Error decoding audio data:', error);
                        });
                    }
                };
                reader.readAsArrayBuffer(file);
            }

            playBackgroundMusic() {
                if (this.backgroundMusic && this.audioContext) {
                    const source = this.audioContext.createBufferSource();
                    source.buffer = this.backgroundMusic;
                    source.connect(this.audioContext.destination);
                    source.start();
                }
            }

            playSoundEffect(index) {
                if (this.soundEffects[index] && this.audioContext) {
                    const source = this.audioContext.createBufferSource();
                    source.buffer = this.soundEffects[index].buffer;
                    source.connect(this.audioContext.destination);
                    source.start();
                }
            }

            playVoiceOver() {
                if (this.voiceOver && this.audioContext) {
                    const source = this.audioContext.createBufferSource();
                    source.buffer = this.voiceOver;
                    source.connect(this.audioContext.destination);
                    source.start();
                }
            }

            startRecording() {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    console.error('MediaDevices API is not supported in this browser');
                    return;
                }
                
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(stream => {
                        this.mediaRecorder = new MediaRecorder(stream);
                        this.recordedChunks = [];
                        
                        this.mediaRecorder.ondataavailable = (event) => {
                            if (event.data.size > 0) {
                                this.recordedChunks.push(event.data);
                            }
                        };
                        
                        this.mediaRecorder.onstop = () => {
                            const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                            const url = URL.createObjectURL(blob);
                            
                            // Load the recorded audio as voice over
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                if (this.audioContext) {
                                    this.audioContext.decodeAudioData(e.target.result, (buffer) => {
                                        this.voiceOver = buffer;
                                        document.getElementById('voiceInput').value = 'Recorded Voice';
                                    }, (error) => {
                                        console.error('Error decoding audio data:', error);
                                    });
                                }
                            };
                            reader.readAsArrayBuffer(blob);
                        };
                        
                        this.mediaRecorder.start();
                    })
                    .catch(error => {
                        console.error('Error accessing microphone:', error);
                    });
            }

            stopRecording() {
                if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                    this.mediaRecorder.stop();
                }
            }

            applySceneTransition(transition) {
                const viewport = document.getElementById('viewport');
                
                // Create transition overlay
                const overlay = document.createElement('div');
                overlay.style.position = 'absolute';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.backgroundColor = '#000';
                overlay.style.zIndex = '100';
                overlay.style.pointerEvents = 'none';
                
                viewport.appendChild(overlay);
                
                // Apply transition based on type
                switch (transition) {
                    case 'fade':
                        overlay.style.opacity = '0';
                        overlay.style.transition = 'opacity 1s';
                        setTimeout(() => {
                            overlay.style.opacity = '1';
                            setTimeout(() => {
                                overlay.style.opacity = '0';
                                setTimeout(() => {
                                    viewport.removeChild(overlay);
                                }, 1000);
                            }, 500);
                        }, 10);
                        break;
                    case 'slide':
                        overlay.style.transform = 'translateX(-100%)';
                        overlay.style.transition = 'transform 1s';
                        setTimeout(() => {
                            overlay.style.transform = 'translateX(0)';
                            setTimeout(() => {
                                overlay.style.transform = 'translateX(100%)';
                                setTimeout(() => {
                                    viewport.removeChild(overlay);
                                }, 1000);
                            }, 500);
                        }, 10);
                        break;
                    case 'zoom':
                        overlay.style.transform = 'scale(0)';
                        overlay.style.transition = 'transform 1s';
                        setTimeout(() => {
                            overlay.style.transform = 'scale(1)';
                            setTimeout(() => {
                                overlay.style.transform = 'scale(2)';
                                setTimeout(() => {
                                    viewport.removeChild(overlay);
                                }, 1000);
                            }, 500);
                        }, 10);
                        break;
                    case 'wipe':
                        overlay.style.clipPath = 'inset(0 100% 0 0)';
                        overlay.style.transition = 'clip-path 1s';
                        setTimeout(() => {
                            overlay.style.clipPath = 'inset(0 0% 0 0)';
                            setTimeout(() => {
                                overlay.style.clipPath = 'inset(0 0% 0 100%)';
                                setTimeout(() => {
                                    viewport.removeChild(overlay);
                                }, 1000);
                            }, 500);
                        }, 10);
                        break;
                    case 'dissolve':
                        // Create a grid of small squares for dissolve effect
                        const gridSize = 20;
                        const gridWidth = Math.ceil(viewport.offsetWidth / gridSize);
                        const gridHeight = Math.ceil(viewport.offsetHeight / gridSize);
                        
                        for (let y = 0; y < gridHeight; y++) {
                            for (let x = 0; x < gridWidth; x++) {
                                const square = document.createElement('div');
                                square.style.position = 'absolute';
                                square.style.left = `${x * gridSize}px`;
                                square.style.top = `${y * gridSize}px`;
                                square.style.width = `${gridSize}px`;
                                square.style.height = `${gridSize}px`;
                                square.style.backgroundColor = '#000';
                                square.style.opacity = '0';
                                square.style.transition = `opacity ${Math.random() * 0.5 + 0.5}s`;
                                overlay.appendChild(square);
                                
                                setTimeout(() => {
                                    square.style.opacity = '1';
                                    setTimeout(() => {
                                        square.style.opacity = '0';
                                    }, 500);
                                }, Math.random() * 500);
                            }
                        }
                        
                        setTimeout(() => {
                            viewport.removeChild(overlay);
                        }, 2000);
                        break;
                }
            }

            update() {
                // Update media-related operations
            }
        }

        /**
         * Recording Manager - Handles recording and exporting animations
         */
        class RecordingManager {
            constructor(sceneManager, animationManager, mediaManager) {
                this.sceneManager = sceneManager;
                this.animationManager = animationManager;
                this.mediaManager = mediaManager;
                this.isRecording = false;
                this.isPaused = false;
                this.recordedFrames = [];
                this.startTime = 0;
                this.pausedTime = 0;
                this.mediaRecorder = null;
                this.recordedChunks = [];
            }

            init() {
                // Set up event listeners for recording controls
                this.setupEventListeners();
            }

            setupEventListeners() {
                document.getElementById('startRecording').addEventListener('click', () => {
                    this.startRecording();
                });
                
                document.getElementById('stopRecording').addEventListener('click', () => {
                    this.stopRecording();
                });
                
                document.getElementById('pauseRecording').addEventListener('click', () => {
                    this.pauseRecording();
                });
                
                document.getElementById('resumeRecording').addEventListener('click', () => {
                    this.resumeRecording();
                });
                
                document.getElementById('exportVideo').addEventListener('click', () => {
                    this.exportAsVideo();
                });
                
                document.getElementById('exportGIF').addEventListener('click', () => {
                    this.exportAsGIF();
                });
                
                document.getElementById('exportSequence').addEventListener('click', () => {
                    this.exportAsImageSequence();
                });
                
                document.getElementById('exportData').addEventListener('click', () => {
                    this.exportAnimationData();
                });
            }

            startRecording() {
                if (this.isRecording) return;
                
                this.isRecording = true;
                this.isPaused = false;
                this.recordedFrames = [];
                this.startTime = Date.now();
                this.pausedTime = 0;
                
                // Update UI
                document.getElementById('startRecording').querySelector('.recording-indicator').classList.remove('stopped');
                document.getElementById('stopRecording').querySelector('.recording-indicator').classList.add('stopped');
                document.getElementById('pauseRecording').querySelector('.recording-indicator').classList.add('stopped');
                document.getElementById('resumeRecording').querySelector('.recording-indicator').classList.add('stopped');
                
                // Start capturing frames
                this.captureFrame();
            }

            stopRecording() {
                if (!this.isRecording) return;
                
                this.isRecording = false;
                this.isPaused = false;
                
                // Update UI
                document.getElementById('startRecording').querySelector('.recording-indicator').classList.add('stopped');
                document.getElementById('stopRecording').querySelector('.recording-indicator').classList.add('stopped');
                document.getElementById('pauseRecording').querySelector('.recording-indicator').classList.add('stopped');
                document.getElementById('resumeRecording').querySelector('.recording-indicator').classList.add('stopped');
            }

            pauseRecording() {
                if (!this.isRecording || this.isPaused) return;
                
                this.isPaused = true;
                this.pausedTime = Date.now();
                
                // Update UI
                document.getElementById('pauseRecording').querySelector('.recording-indicator').classList.remove('stopped');
                document.getElementById('resumeRecording').querySelector('.recording-indicator').classList.add('stopped');
            }

            resumeRecording() {
                if (!this.isRecording || !this.isPaused) return;
                
                this.isPaused = false;
                this.startTime += Date.now() - this.pausedTime;
                
                // Update UI
                document.getElementById('pauseRecording').querySelector('.recording-indicator').classList.add('stopped');
                document.getElementById('resumeRecording').querySelector('.recording-indicator').classList.remove('stopped');
            }

            captureFrame() {
                if (!this.isRecording) return;
                
                if (!this.isPaused) {
                    // Capture the current frame
                    const canvas = this.sceneManager.renderer.domElement;
                    const imageData = canvas.toDataURL('image/png');
                    const timestamp = Date.now() - this.startTime;
                    
                    this.recordedFrames.push({
                        imageData,
                        timestamp
                    });
                }
                
                // Schedule next frame capture
                requestAnimationFrame(() => this.captureFrame());
            }

            exportAsVideo() {
                if (this.recordedFrames.length === 0) return;
                
                // This would require a video encoding library
                // For now, we'll just show a notification
                this.showNotification('Video export would require a video encoding library', 'info');
            }

            exportAsGIF() {
                if (this.recordedFrames.length === 0) return;
                
                // This would require a GIF encoding library
                // For now, we'll just show a notification
                this.showNotification('GIF export would require a GIF encoding library', 'info');
            }

            exportAsImageSequence() {
                if (this.recordedFrames.length === 0) return;
                
                // Create a zip file of all frames
                // This would require a zip library
                // For now, we'll just show a notification
                this.showNotification('Image sequence export would require a zip library', 'info');
            }

            exportAnimationData() {
                if (this.recordedFrames.length === 0) return;
                
                // Create a JSON file with animation data
                const animationData = {
                    frames: this.recordedFrames,
                    metadata: {
                        frameCount: this.recordedFrames.length,
                        duration: this.recordedFrames[this.recordedFrames.length - 1].timestamp,
                        fps: 1000 / (this.recordedFrames[1].timestamp - this.recordedFrames[0].timestamp)
                    }
                };
                
                const blob = new Blob([JSON.stringify(animationData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'animation_data.json';
                a.click();
                URL.revokeObjectURL(url);
            }

            showNotification(message, type = 'info') {
                const notification = document.getElementById('notification');
                notification.textContent = message;
                notification.className = `notification ${type}`;
                notification.classList.add('show');
                
                setTimeout(() => {
                    notification.classList.remove('show');
                }, 3000);
            }

            update() {
                // Update recording-related operations
            }
        }

        // Initialize the application
        const animationEngine = new AnimationEngine('viewport');
                   
    return {AnimationEngine,
            SceneManager,
            AnimationManager,
            PhysicsManager,
            EditManager,
            UIManager,
            RecordingManager,
            MediaManager,
            animationEngine
        }           
    }
    )
)

        