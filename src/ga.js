class GeneticAlgorithm {
  static useCustomGenome(customGenome) {
    globals.humans.forEach(human => {
      human.genome = JSON.parse(JSON.stringify(customGenome));
    });
  }

  static initializePopulation() {
    globals.generationIndex = 1;
    globals.aliveHumans = 0;
    globals.finishedHumans == 0;
    UIController.displayGenerationIndex();
    UIController.displayBestHumanStats();
    for (let i = 0; i < config.populationSize; i += 1) {
      globals.aliveHumans += 1;
      const human = new Human(config.initialPosition.x, config.initialPosition.y);
      globals.humans.push(human);
    }
  }

  static simulateSingleStep() {
    globals.world.Step(1 / 60, 8, 3);
    globals.world.ClearForces();

    if (globals.aliveHumans === 0) {
      clearInterval(globals.simulationInterval);
      clearInterval(globals.evolutionInterval);
      GeneticAlgorithm.createNextGeneration();
      GeneticAlgorithm.runAllSimulationIntervals();
    }

    for (const human of globals.humans) {
      // console.log("Head Y position: " + human.head.GetPosition().y);
      if (!human.isFinisher && human.checkIfFinisher()) {
        human.isFinisher = true;
        globals.finishedHumans += 1;
        human.assignScore();
        globals.aliveHumans -= 1;


      }
      if (human.isAlive && human.checkStillAlive()) {
        human.isAlive = false;
        globals.aliveHumans -= 1;
      }


      if (human.isAlive) {
        human.walk(config.motorNoise);
        human.assignScore();
      }
    }
    globals.stepCounter += 1;
  }

  static runAllSimulationIntervals() {
    // Evolve every <config.simulationPeriod> seconds
    globals.evolutionInterval = setInterval(() => {
      GeneticAlgorithm.createNextGeneration();
    }, (1000 * config.simulationPeriod) / config.simulationSpeed);

    // Run Simulation
    globals.simulationInterval = setInterval(() => {
      for (let i = 0; i < config.simulationSpeed; i += 1) {
        GeneticAlgorithm.simulateSingleStep();
      }
    }, 1000 / 60);
  }

  static assignFitness(totalScore) {
    for (const human of globals.humans) {
      if (human.score > 0 && totalScore > 0) {
        human.fitness = human.score / totalScore;
      } else {
        human.fitness = 0.1;
      }
    }
  }

  static createNextGeneration() {
    // Store Generation High score
    const totalScore = globals.humans.reduce((acc, cur) => ({
      score: acc.score + cur.score
    })).score;
    const genBestHuman = globals.humans.reduce((a, b) => (a.score > b.score ? a : b));
    const genHighScore = genBestHuman.score;
    const genAvgScore = totalScore / config.populationSize;
    globals.generationHighScores.push(genHighScore);
    globals.generationAvgScores.push(genAvgScore);
    UIController.displayChart();

    // Store Best Human
    if (genHighScore > globals.bestHuman.score) {
      globals.bestHuman = genBestHuman;
      console.log('New Top Score: ', int(genBestHuman.score), genBestHuman);
      document.getElementById('userGenomeInput').value = JSON.stringify(globals.bestHuman.genome, null, 2);
    }

    // Evaluate Fitness
    GeneticAlgorithm.assignFitness(totalScore);

    // Create New Set of humans
    const newGeneration = [];

    // Elitism: add the clone of the best human to the new generation
    // without mutations for faster neural network learning
    newGeneration.push(new Human(config.initialPosition.x, config.initialPosition.y, genBestHuman.genome));

    for (let i = 0; i < config.populationSize - 1; i++) {
      const parentA = GeneticAlgorithm.selectOne();
      const parentB = GeneticAlgorithm.selectOne();

      // Crossover
      const child = GeneticAlgorithm.crossover(parentA, parentB);

      // Mutation
      GeneticAlgorithm.mutate(child, config.mutationRate);
      newGeneration.push(child);
    }

    // Kill current generation
    GeneticAlgorithm.killGeneration();

    // Add new set of humans to next generation
    globals.humans = newGeneration;
    globals.generationIndex += 1;
    globals.stepCounter = 0;
    globals.aliveHumans = newGeneration.length;
    globals.finishedHumans = 0;
    UIController.displayGenerationIndex();
    UIController.displayBestHumanStats();
  }

  static killGeneration() {
    for (const human of globals.humans) {
      if (human.isAlive) {
        globals.isAlive -= 1;
        human.isAlive = false;
      }

      for (const bodyPart of human.bodyParts) {
        globals.world.DestroyBody(bodyPart);
      }
    }
  }

  static selectOne() {
    do {
      let r = Math.random();
      var betterHumans = globals.humans.filter(h => h.fitness > r);
    } while (betterHumans.length == 0);

    let one = betterHumans[Math.floor(Math.random() * betterHumans.length)];
    return one;
  }

  static mutate(human, probability) {

    for (const gene of human.genome) {
      const randomNum = Math.random();
      if (randomNum < probability) {
        gene.amplitude =  (gene.amplitude + config.maxAmplitude * (2*Math.random() - 1))/2;
        gene.frequency = (gene.frequency + config.maxFrequency * Math.random())/2;
        gene.phase = (gene.phase+Math.random() * Math.PI * 2)/2;
        // gene.frequency = gene.frequency + gene.frequency * (2 * Math.random() - 1);
        // gene.amplitude = gene.amplitude + gene.amplitude * (2 * Math.random() - 1);
        // gene.phase = gene.phase + Math.PI / 2 * (2 * Math.random() - 1);
        // gene.frequency = Math.random() * 2 * gene.frequency;
        // gene.amplitude = Math.random() * 2 * gene.amplitude;
        // gene.phase = Math.random() * 2 * gene.phase;
        // gene.frequency = Math.random() * 2 * gene.frequency;
        // gene.amplitude = gene.amplitude + config.maxAmplitude * Math.random() - config.maxAmplitude / 2;
        // gene.phase = Math.random() * 2 * gene.phase;
      }
    }

  }

  static crossover(parentA, parentB) {
    const totalJoints = parentA.genome.length;
    const dividingIndex = Math.floor(Math.random() * totalJoints);
    const newGenome = [];
    for (let i = 0; i < totalJoints; i += 1) {
      const parent = i < dividingIndex ? parentA : parentB;
      const newGene = {
        amplitude: Math.max(Math.min(parent.genome[i].amplitude, config.maxAmplitude), -1 * config.maxAmplitude),
        phase: parent.genome[i].phase % 2 * Math.PI,
        frequency: Math.max(Math.min(parent.genome[i].frequency, config.maxFrequency), config.minFrequency)
      };
      newGenome.push(newGene);
    }

    const child = new Human(config.initialPosition.x, config.initialPosition.y, newGenome);
    return child;
  }
}