let video;
let handPose;
let hands = [];
let painting;
let px = 0;
let py = 0;
let h = 8;
let colors = [];
let selectedColor;


let lastSaveTime = -Infinity; // Initialize to ensure the first save is always allowed
const saveCooldown = 5000; // 5000 milliseconds = 5 seconds


function preload() {
  handPose = ml5.handPose({ flipped: true });
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
		
		let hands_array = [];
		for (let hand of hands){
			let thumb = hand.thumb_tip;
			hands_array.push([thumb.x, thumb.y]);
		}
		first_two_hands = hands_array.slice(0, 2);
		let d = dist(first_two_hands.at(0).at(0), first_two_hands.at(0).at(1), first_two_hands.at(1).at(0), first_two_hands.at(1).at(1)); 
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


// IMPORTANT: Replace with your actual API Key and potentially a more specific model
const GEMINI_API_KEY = "YOUR_GOOGLE_AI_API_KEY"; // <--- PUT YOUR KEY HERE (See Security Note!)
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`;

async function sendPaintingToGemini(graphicsBuffer) {
  // 1. Get the underlying HTML Canvas element from the p5.Graphics object
  const canvasElement = graphicsBuffer.elt;

  // 2. Get the image data as a Base64 encoded string (JPEG format)
  // You can use 'image/png' for lossless, potentially larger data
  const mimeType = 'image/jpeg';
  const quality = 0.8; // Optional quality setting for JPEG (0.0 to 1.0)
  const dataUrl = canvasElement.toDataURL(mimeType, quality);

  // 3. Extract the Base64 data part (remove the "data:image/jpeg;base64," prefix)
  const base64Data = dataUrl.split(',')[1];

  // 4. Prepare the Gemini API request payload
  const requestBody = {
    contents: [{
      parts: [
        { text: "Describe this image." }, // Your prompt for Gemini
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        }
      ]
    }],
    // Optional: Add generationConfig if needed
    // generationConfig: {
    //   "temperature": 0.4,
    //   "topK": 32,
    //   "topP": 1,
    //   "maxOutputTokens": 4096,
    //   "stopSequences": []
    // },
  };

  // 5. Send the request using fetch
  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Handle API errors (e.g., invalid key, rate limits)
      const errorData = await response.json();
      console.error("Gemini API Error:", response.status, errorData);
      alert(`Error calling Gemini: ${errorData.error?.message || response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log("Gemini Response:", data);

    // Process the response (usually in data.candidates[0].content.parts[0].text)
    if (data.candidates && data.candidates.length > 0) {
        const description = data.candidates[0].content.parts[0].text;
        console.log("Gemini Description:", description);
        // You could display this description on the page, etc.
        alert("Gemini says:\n" + description);
    } else {
        console.log("No content returned from Gemini.");
        alert("Gemini returned no description.");
    }


  } catch (error) {
    // Handle network errors
    console.error("Network Error:", error);
    alert("Network error when trying to reach Gemini.");
  }
}

