const config = {
  initialPosition: {
    x: 1.,
    y: 3.
  },
  scale: 100,
  maxTorque: 10,
  maxAmplitude: 10, // magnitude
  minAmplitude: 1, // magnitude
  maxFrequency: 0.2, // rad / sec
  minFrequency: 0.01,
  simulationSpeed: 1, // factor
  populationSize: 10, // number of bipeds
  simulationPeriod: 10,
  mutationRate: 0.30,
  minBodyDelta: 0.15,
  maxLegDelta: 0.6,
  motorNoise: 0.0001,
  floorThickness: 0.05,
  floorFriction: 0.1,
  floorX: 4,
  floorY: 3.5,
  canvas: {
    width: 800,
    height: 400,
  },
};


const globals = {
  world: null,
  stepCounter: 0,
  generationIndex: -1,
  humans: [],
  generationHighScores: [],
  generationAvgScores: [],
  bestHuman: {
    score: 0,
    distanceTraveled: 0
  },
};

// let floorImg, bgImg;
// function preload() {
//   floorImg = loadImage('https://raw.githubusercontent.com/adityathebe/evolutionSimulator/master/assets/ground.png');
//   bgImg = loadImage('https://raw.githubusercontent.com/adityathebe/evolutionSimulator/master/assets/bg.png');
// }

const setUpEnvironment = () => {
  // Create World
  const gravity = new b2.Vec2(0, 10);
  globals.world = new b2.World(gravity, true);

  // Create Floor
  globals.floor = createFloor();

  // Create Humans
  GeneticAlgorithm.initializePopulation();
};

function setup() {
  document.getElementById("rangevalue").textContent = config.simulationSpeed.toFixed(2);
  const canvas = createCanvas(config.canvas.width, config.canvas.height);
  canvas.parent('mainCanvas');

  rectMode(CENTER);
  imageMode(CENTER);

  setUpEnvironment();
  GeneticAlgorithm.runAllSimulationIntervals();

  // Show Stats
  setInterval(UIController.displayHumanStat, 500);
}

function draw() {
  background(51);
  scale(config.scale);
  noStroke();
  // image(bgImg, 4, 1.68, bgImg.width / config.scale, bgImg.height / config.scale);

  // Display Humans
  for (const human of globals.humans) {
    if (human.isAlive) {
      human.display();
    }
  }

  drawRect(globals.floor);
  // image(floorImg, 4, 4 + 0.1, floorImg.width / config.scale, floorImg.height / config.scale);
}

function drawRect(body) {
  const fixture = body.GetFixtureList();
  const shape = fixture.GetShape();
  beginShape();
  for (var i = 0; i < 4; i += 1) {
    const {
      x,
      y
    } = body.GetWorldPoint(shape.m_vertices[i]);
    vertex(x, y);
  }
  endShape();
}

const rangeInput = document.getElementById('simulationSlider');
rangeInput.addEventListener(
  'input',
  function (event) {
    config.simulationSpeed = rangeInput.value;
    document.getElementById("rangevalue").textContent = parseFloat(rangeInput.value).toFixed(2);
    clearInterval(globals.simulationInterval);
    clearInterval(globals.evolutionInterval);
    if (config.simulationSpeed > 0) {
      GeneticAlgorithm.runAllSimulationIntervals();
    }
  },
  false
);