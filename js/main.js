const slider = document.getElementById('rotationSlider');
const textInput = document.getElementById('textInput');
const micButton = document.getElementById('micButton');
let currentMode = 'free'; 
const sendMessageButton = document.getElementById('sendButton');
const chatMessages = document.getElementById('chatMessages');
const toggleButton = document.getElementById('toggleAngry');

function getModeThreshold() {
    let threshold;

    switch (currentMode) {
        case 'strict':
            threshold = 0.65;
            break;
        case 'moderate':
            threshold = 0.85;
            break;
        case 'free':
        default:
            threshold = 0.95;
            break;
    }
    console.log(`getModeThreshold called. Current mode: ${currentMode}, Threshold: ${threshold}`);
    return threshold;
}

function handleMessage(sentence) {
    const botSubtitle = document.getElementById('botSubtitle');
    sentenceOriginal = sentence;
    sentence = sentence.toLowerCase();

    (async () => {
        try {
            console.log("Processing sentence:", sentence);

            console.time("API Response Time");

            const language = await detectLanguage(sentence);
            console.log("Detected language:", language);

            const model = language === "english" ? ENGLISH_HATE_SPEECH_MODEL : TAGALOG_HATE_SPEECH_MODEL;

            const predictions = await callHateSpeechAPI(model, sentence);
            console.timeEnd("API Response Time");

            if (predictions.length > 0) {
                const normalizedPredictions = predictions.map(prediction => ({
                    label: prediction.label === "LABEL_1" ? "HATE" :
                           prediction.label === "LABEL_0" ? "NON_HATE" : prediction.label,
                    score: prediction.score
                }));

                const highestPrediction = normalizedPredictions.reduce(
                    (prev, current) => (prev.score > current.score ? prev : current)
                );

                const { label, score } = highestPrediction;
                const isHateSpeech = label === "HATE" ? "hate speech" : "not hate speech";
                const confidence = Math.round(score * 100);

                const botMessage = `I estimate that there is a ${confidence}% probability that what you said is ${isHateSpeech}.`;

                // Add the bot reply to the chat box
                addMessage(botMessage, 'bot', label);

                // Display the bot reply as a subtitle
                showBotSubtitle(botMessage);

                // If hate speech detected, trigger angry mode
                if (label === "HATE") {
                    setAngryMode(true);
                    setTimeout(() => setAngryMode(false), 3000);
                    randomWords.push(sentence);
                }
            } else {
                console.log("No prediction results found.");
            }
        } catch (error) {
            console.error("Error processing sentence:", error);

            // Show error in subtitle
            showBotSubtitle("An error occurred while processing your request. Please try again.");
        } finally {
            // Enable buttons after processing
            document.querySelectorAll('button').forEach(button => {
                button.disabled = false;
            });
        }
    })();
}


function showBotSubtitle(content) {
    const subtitle = document.getElementById('botSubtitle');
    subtitle.textContent = '';
    subtitle.style.display = 'block';

    let index = 0;
    const typingInterval = setInterval(() => {
        subtitle.textContent += content.charAt(index);
        index++;
        if (index === content.length) {
            clearInterval(typingInterval);
            setTimeout(() => {
                subtitle.style.display = 'none';
            }, 3000);
        }
    }, 50);
}



function toggleChatMessages() {
    const chatMessages = document.getElementById('chatMessages');
    
    // Check if the chatMessages container has content
    if (chatMessages.innerHTML.trim() !== '') {
        chatMessages.classList.toggle('open');
    }
}

const toggleMessagesButton = document.getElementById('toggleMessages');
toggleMessagesButton.addEventListener('click', toggleChatMessages);

textInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

function sendMessage() {
    const sentence = textInput.value.trim();
    if (sentence) {
        handleMessage(sentence);
        textInput.value = "";
    }
}

function addMessage(content, sender = 'user', label = 'not') {
    const message = document.createElement('div');
    if (label === 'HATE' && sender === 'bot') {
        message.className = `message ${sender} red-message`;
    } else {
        message.className = `message ${sender}`;
    }

    message.textContent = content;

    chatMessages.prepend(message);

    // Automatically scroll to the top
    chatMessages.scrollTop = -chatMessages.scrollHeight;

    // Text-to-speech functionality for bot messages
    if (sender === 'bot') {
        const utterance = new SpeechSynthesisUtterance(content);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    }

    // Remove the message with a fade-out effect
    setTimeout(() => {
        message.classList.add('fade-out'); // Add fade-out class after 8 seconds
        setTimeout(() => message.remove(), 3000); // Wait for fade-out (3 seconds) before removing
    }, 8000); // Start fade-out process after 8 seconds
}





sendMessageButton.addEventListener("click", function() {
    sendMessage();
});

// Scrolling text setup
const scrollingTextElement = document.getElementById('scrollingText');
const randomWords = [
    '%#@#$', 
    'Removed due to hate speech', 
    'FilterX', 
    'Hate speech detected', 
    'Content flagged', 
    'Blocked by algorithm', 
    'Offensive content', 
    'Filtered message'
];

// Function to generate random scroll text
function generateRandomScrollText() {
    let textContent = '';
    let totalWords = 10; // Number of words in a scroll
    for (let i = 0; i < totalWords; i++) {
        const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];
        textContent += randomWord + ' ';
    }
    return textContent;
}

// Function to spawn text at random vertical positions
function spawnRandomText() {
    const span = document.createElement('span');
    const scrollText = generateRandomScrollText();
    span.textContent = scrollText;

    // Randomize the Y position of each text block
    const randomY = Math.random(); // Random vertical position (from 0 to 1)
    span.style.setProperty('--randomY', randomY); // Set custom property for animation

    // Randomize the duration of each animation
    const animationDuration = Math.random() * 5 + 5; // Random duration (5s - 10s)
    span.style.animationDuration = `${animationDuration}s`; // Apply random duration

    // Append the span element to the container
    scrollingTextElement.appendChild(span);

    // Remove the text block after it finishes its animation
    setTimeout(() => {
        span.remove();
    }, animationDuration * 1000); // 1000 to convert seconds to milliseconds
}

// Spawn new text every 2 seconds
setInterval(spawnRandomText, 2000);

// Initialize Three.js scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('threeCanvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add ambient and point lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0x00ffff, 1.5, 100);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// Variables for cursor rotation
let cursorX = 0;
let cursorY = 0;

// Load FBX model
const loader = new THREE.FBXLoader();
let model;
let isAngry = false;

loader.load(
    '3d/Neon_Visage_1206161440_texture_smile.fbx',
    (object) => {
        model = object;

        model.scale.set(0.02, 0.02, 0.02);
        model.position.set(0, 1, 0);
        scene.add(model);

        document.getElementById('loading').style.display = 'none';
    },
    (xhr) => {
        const percentLoaded = (xhr.loaded / xhr.total) * 100;
        document.getElementById('loading').innerText = `Loading... ${Math.round(percentLoaded)}%`;
    },
    (error) => {
        console.error('An error occurred while loading the FBX model:', error);
    }
);

// Set camera position
camera.position.z = 5;

let typingTimeout;
let isTyping = false;
const maxSliderValue = 60;
let lastSliderValue = 0;
let lastRotation = 0;
let recognition;
let isRecognizing = false;
let recognitionTimeout;

let lerpCursorX = 0;
let lerpCursorY = 0;
const lerpSpeed = 0.1;

let touchX = 0;
let touchY = 0;

window.addEventListener('mousemove', (event) => {
    if (!isTyping) {
        cursorX = (event.clientX / window.innerWidth) * 2 - 1;
        cursorY = (event.clientY / window.innerHeight) * 2 - 1;
    }
});

window.addEventListener('touchmove', (event) => {
    if (!isTyping && event.touches.length === 1) {
        const touch = event.touches[0];
        touchX = (touch.clientX / window.innerWidth) * 2 - 1;
        touchY = (touch.clientY / window.innerHeight) * 2 - 1;
    }
});

// Toggle angry mode
toggleButton.addEventListener('click', () => {
    toggleAngryMode();
});

function toggleAngryMode() {
    if (model) {
        isAngry = !isAngry;
        if (isAngry) {
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material.color.set(0xff0000);
                }
            });
        } else {
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material.color.set(0xffffff);
                }
            });
        }
    }
}

function setAngryMode(setOn = false) {
    if (model) {
        const targetColor = setOn ? new THREE.Color(0xff0000) : new THREE.Color(0xffffff); // Red or White
        const duration = 1;
        const stepTime = 30;

        model.traverse((child) => {
            if (child.isMesh) {
                const startColor = child.material.color.clone();
                let elapsedTime = 0;

                const transition = setInterval(() => {
                    elapsedTime += stepTime / 1000;
                    const progress = Math.min(elapsedTime / duration, 1);

                    child.material.color.set(startColor.lerp(targetColor, progress));

                    if (progress >= 1) {
                        clearInterval(transition);
                    }
                }, stepTime);
            }
        });

        scrollingTextElement.style.color = setOn ? '#ff0000' : '#204262';
    }
}




if ('webkitSpeechRecognition' in window) {
    console.log('webkitSpeechRecognition');
    let recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let isRecognizing = false;
    let recognitionTimeout;

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        textInput.value = transcript;
    };

    recognition.onstart = () => {
        isRecognizing = true;
        micButton.innerHTML = '<i class="fas fa-stop"></i>'; 
        clearTimeout(recognitionTimeout);
    };

    recognition.onend = () => {
        isRecognizing = false;
        micButton.innerHTML = '<i class="fas fa-microphone"></i>';
        recognitionTimeout = setTimeout(() => {
            const sentence = textInput.value.trim();
            if (sentence) {
                handleMessage(sentence); 
                textInput.value = ""; 
            }
        }, 2000);
    };

    micButton.addEventListener('click', () => {
        if (isRecognizing) {
            recognition.stop(); 
        } else {
            recognition.start();
        }
    });
}



// Detect typing activity
textInput.addEventListener('input', () => {
    isTyping = true;
    clearTimeout(typingTimeout); // Reset the timeout each time a key is pressed

    // Calculate the slider value based on text input length
    const textLength = textInput.value.length;
    const maxTextLength = maxSliderValue; // Max length when the slider is at its max value

    // Set the slider value to track text length (loop back to 0 when reaching max)
    slider.value = (textLength % maxTextLength) - 40;
    slider.dispatchEvent(new Event('input'));

    typingTimeout = setTimeout(() => {
        isTyping = false;
    }, 500); // 500ms after the last input, re-enable cursor rotation
});

// Update slider rotation smoothly
slider.addEventListener('input', () => {
    const targetValue = (slider.value * Math.PI) / 180; // Convert to radians

    if (model) {
        // Smooth transition of rotation value
        const smoothFactor = 0.1; // The lower, the smoother the transition
        const deltaRotation = targetValue - lastRotation;
        model.rotation.y += deltaRotation * smoothFactor; // Smooth rotation on the Y axis

        // Update the last rotation to the target value for the next frame
        lastRotation = model.rotation.y;
    }
});

// Render loop
function animate() {
    requestAnimationFrame(animate);

    if (model) {
        if (!isTyping) {
            // Smooth interpolation for mouse and touch inputs
            if (touchX !== 0 || touchY !== 0) {
                lerpCursorX += (touchX - lerpCursorX) * lerpSpeed;
                lerpCursorY += (touchY - lerpCursorY) * lerpSpeed;
            } else {
                lerpCursorX += (cursorX - lerpCursorX) * lerpSpeed;
                lerpCursorY += (cursorY - lerpCursorY) * lerpSpeed;
            }

            model.rotation.y = lerpCursorX * Math.PI * 0.2; // Smooth Y-axis rotation
            model.rotation.x = lerpCursorY * Math.PI * 0.1; // Smooth X-axis rotation
        }
    }

    renderer.render(scene, camera);
}
animate();

// Handle window resizing
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Check for mobile viewport adjustments (keyboard appears)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
        const keyboardOpen = window.visualViewport.height < window.innerHeight * 0.9;
        if (keyboardOpen) {
            if (model) {
                model.scale.set(0.01, 0.01, 0.01);
                model.position.y = -0.5;
            }
        } else {
            if (model) {
                model.scale.set(0.02, 0.02, 0.02); // Reset scale
                model.position.y = 1; // Reset position
            }
        }
    }

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});