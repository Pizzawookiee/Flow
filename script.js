let video;
let handPose;
let hands = [];
let painting;
let px = 0;
let py = 0;
let h = 8;
let colors = [];
let selectedColor;

function preload() {
  handPose = ml5.handPose({ flipped: true });
}

function gotHands(results) {
  hands = results;
}

function setup() {
  createCanvas(640, 480);
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
  if (hands.length > 0) {
    let rightHand, leftHand;
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
