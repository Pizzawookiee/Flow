

let video;
let handPose;
let hands = [];
let painting;
let px = 0;
let py = 0;
let h = 8;
let colors = [];
let selectedColor;

let geminiApiKey; // Variable to hold the API key
let apiKeyLoaded = false; // Flag to track if the key is loaded
let apiKeyError = null; // To store any loading errors

let lastSaveTime = -Infinity; // Initialize to ensure the first save is always allowed
const saveCooldown = 5000; // 5000 milliseconds = 5 seconds


function preload() {
  handPose = ml5.handPose({ flipped: true });
  //loadStrings('api_key.txt', handleKeyLoaded, handleKeyError);
}

// Callback function for successful key loading
function handleKeyLoaded(result) {
  if (result && result.length > 0) {
    geminiApiKey = result[0].trim(); // Get the first line and remove whitespace
    if (geminiApiKey) {
      console.log("API Key loaded successfully.");
      apiKeyLoaded = true;
    } else {
      apiKeyError = "API key file is empty.";
      console.error(apiKeyError);
    }
  } else {
    apiKeyError = "Could not read API key file or file is empty.";
    console.error(apiKeyError);
  }
}

// Callback function for errors during key loading
function handleKeyError(error) {
  apiKeyError = "Error loading api_key.txt. Make sure the file exists in the sketch directory and the server is running.";
  console.error(apiKeyError, error);
}


function gotHands(results) {
  hands = results;
}

function setup() {
  myCanvas = createCanvas(640, 480);
  colorMode(HSB);
  painting = createGraphics(640, 480);
  painting.colorMode(HSB);
  painting.clear();

  // Define colors for each finger
  colors = [
    color(197, 82, 95), // Index finger - #2DC5F4
    color(283, 69, 63), // Middle finger - #9253A1
    color(344, 100, 93), // Ring finger - #EC015A
    color(32, 68, 97) // Pinky finger - #F89E4F
  ];
  selectedColor = colors[0];

  video = createCapture(VIDEO, { flipped: true });
  video.hide();
  handPose.detectStart(video, gotHands);
}

function draw() {
  image(video, 0, 0);
  
  push(); // Isolate text style changes
  fill(255); // White color for text (RGB default, works fine)
  // Or use HSB white: fill(0, 0, 100);
  stroke(0); // Black outline for better visibility over video
  strokeWeight(2);
  textSize(18);
  textAlign(LEFT, TOP); // Align text to top-left
  
  if (hands.length > 0) {
    let rightHand, leftHand;
	
	
	// Code to save images:
	if (hands.length > 1) {
		//text('hands', 10, 10);
		
		let thumbs_array = [];
		let pinkys_array = [];
		for (let hand of hands){
			let thumb = hand.thumb_tip;
			let pinky = hand.pinky_finger_tip;
			thumbs_array.push([thumb.x, thumb.y]);
			pinkys_array.push([pinky.x, pinky.y]);
		}
		first_two_thumbs = thumbs_array.slice(0, 2);
		let d = dist(first_two_thumbs.at(0).at(0), first_two_thumbs.at(0).at(1), first_two_thumbs.at(1).at(0), first_two_thumbs.at(1).at(1)); 
		if (d < 30) {
			//save
			//text('hands', 10, 10);
			let currentTime = millis(); // Get the current time in milliseconds
			if (currentTime - lastSaveTime >= saveCooldown) {

				//text(`Time: ${currentTime}ms. Cooldown elapsed. Saving!`, 20, 20);

				// --- Perform the save ---
				//saveCanvas(myCanvas, 'myDrawing', 'jpg'); // Add frameCount for unique names
				save(painting, 'myPainting.jpg');
				// --- IMPORTANT: Update the last save time and reset the trigger ---
				lastSaveTime = currentTime;
				//triggerSaveCondition = false; // Reset the trigger immediately after saving

			}

		}
		first_two_pinkys = pinkys_array.slice(0, 2);
		let d2 = dist(first_two_pinkys.at(0).at(0), first_two_pinkys.at(0).at(1), first_two_pinkys.at(1).at(0), first_two_pinkys.at(1).at(1)); 
		if (d2 < 30) {
			painting.clear();

		}
	}
	
			
	
	
    for (let hand of hands) {
      if (hand.handedness === "Right") {
        let index = hand.index_finger_tip;
        let thumb = hand.thumb_tip;
        rightHand = { index, thumb };
      }
      if (hand.handedness === "Left") {
        let thumb = hand.thumb_tip;
        let index = hand.index_finger_tip;
        let middle = hand.middle_finger_tip;
        let ring = hand.ring_finger_tip;
        let pinky = hand.pinky_finger_tip;
        let fingers = [index, middle, ring, pinky];

        // Draw a circle at each finger position with the assigned color
        for (let i = 0; i < fingers.length; i++) {
          let finger = fingers[i];
          let d = dist(finger.x, finger.y, thumb.x, thumb.y);

          // Draw circle if a finger is near the thumb
          if (d < 30) {
            fill(colors[i]);
            noStroke();
            circle(finger.x, finger.y, 36);
            selectedColor = colors[i];
          }
        }
      }
    }

    if (rightHand) {
      let { index, thumb } = rightHand;
      let x = (index.x + thumb.x) * 0.5;
      let y = (index.y + thumb.y) * 0.5;
      painting.noStroke();
      painting.fill(255, 0, 255);
      let d = dist(index.x, index.y, thumb.x, thumb.y);
      if (d < 20) {
        painting.stroke(selectedColor); // Draw with the selected finger color
        painting.strokeWeight(16);
        painting.line(px, py, x, y);
      }
      px = x;
      py = y;
    }
  }
  image(painting, 0, 0);
}


async function sendPaintingToGemini(graphicsBuffer) {
  // Construct the URL using the loaded key
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiApiKey}`;

  // 1. Get the underlying HTML Canvas element
  const canvasElement = graphicsBuffer.elt;

  // 2. Get Base64 data
  const mimeType = 'image/jpeg';
  const quality = 0.8;
  const dataUrl = canvasElement.toDataURL(mimeType, quality);
  const base64Data = dataUrl.split(',')[1];

  // 3. Prepare API request payload
  const requestBody = {
    contents: [{
      parts: [
        { text: "Transform this image into a more detailed watercolor painting." },
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        }
      ]
    }],
     // Optional generationConfig
  };

  // 4. Send request
  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", response.status, errorData);
      alert(`Error calling Gemini: ${errorData.error?.message || response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log("Gemini Response:", data);
	/*
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content.parts.length > 0) {
        const description = data.candidates[0].content.parts[0].text;
        console.log("Gemini Description:", description);
        alert("Gemini says:\n" + description);
    } else {
        // Handle cases where the response structure might be different or empty
        const responseText = JSON.stringify(data);
        console.log("Unexpected or empty response from Gemini:", responseText);
        if(data.promptFeedback) {
             alert("Gemini blocked the request or returned no content. Reason: " + data.promptFeedback.blockReason);
        } else {
             alert("Gemini returned an empty or unexpected response.");
        }
    }
	*/

  } catch (error) {
    console.error("Network Error:", error);
    alert("Network error when trying to reach Gemini.");
  }
}