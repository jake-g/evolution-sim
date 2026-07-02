function changeBrightness(hex, percent, sign) {
  // strip the leading # if it's there
  hex = hex.replace(/^\s*#|\s*$/g, '');

  // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
  if (hex.length == 3) {
    hex = hex.replace(/(.)/g, '$1$1');
  }

  var r = parseInt(hex.substr(0, 2), 16),
    g = parseInt(hex.substr(2, 2), 16),
    b = parseInt(hex.substr(4, 2), 16);

  return '#' +
    ((0 | (1 << 8) + r + sign * (256 - r) * percent / 100).toString(16)).substr(1) +
    ((0 | (1 << 8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
    ((0 | (1 << 8) + b + sign * (256 - b) * percent / 100).toString(16)).substr(1);
}

class UIController {
  static uploadCustomGenome() {
    const customGenome = JSON.parse(document.getElementById('userGenomeInput').value);
    GeneticAlgorithm.useCustomGenome(customGenome);
  }

  static downloadBestGenome() {
    if (globals.bestHuman.genome) {
      const bestGenome = JSON.parse(JSON.stringify(globals.bestHuman.genome, null, 2));
      saveJSON(bestGenome, 'bestGenome.json');
    }
  }

  static mutateBestGenome() {
    if (globals.bestHuman.genome) {
      GeneticAlgorithm.mutate(globals.bestHuman, 1.0)
      document.getElementById('userGenomeInput').value = JSON.stringify(globals.bestHuman.genome, null, 2);
      GeneticAlgorithm.useCustomGenome(globals.bestHuman.genome);

    }
  }

  static freezeSimulation() {
    const frozenSpeed = 0.0;
    document.getElementById('simulationSlider').value = frozenSpeed;
    document.getElementById("rangevalue").textContent = frozenSpeed.toFixed(2);
    clearInterval(globals.simulationInterval);
    clearInterval(globals.evolutionInterval);
  }

  static resetSpeed(value=1) {
    document.getElementById('simulationSlider').value = value;
    document.getElementById("rangevalue").textContent = value.toFixed(2);
    config.simulationSpeed = value;
    // clearInterval(globals.simulationInterval);
    // clearInterval(globals.evolutionInterval);
  }

  static reloadPage() {
      window.location.reload();
  }
  
  static displayHumanStat() {
    const table = document.getElementById('humanstats');
    table.innerHTML = '';
    let index = 0;

    const head = table.insertRow(-1);
    head.insertCell(-1).innerHTML = 'Biped';
    head.insertCell(-1).innerHTML = 'Score';
    head.insertCell(-1).innerHTML = 'Distance';
    head.insertCell(-1).innerHTML = 'Finish Cycle';

    head.style.fontWeight = 'bold';

    for (const human of globals.humans) {
      const row = table.insertRow(-1);
      row.insertCell(-1).innerHTML = ++index;
      row.insertCell(-1).innerHTML = human.score.toFixed(2);
      row.insertCell(-1).innerHTML = human.distanceTraveled.toFixed(2);
      row.insertCell(-1).innerHTML = human.finishTime.toFixed(2);

      if (human.distanceTraveled > 2) {
        row.style.backgroundColor = "#404040";
      }
      if (human.isFinisher === true) {
        row.style.color = "#2ecc71";
      } else if (human.isAlive === true) {
        const percentBrighter = Math.max(Math.min((50*human.distanceTraveled/ human.finishLineX), 100), 0.1);
        row.style.color =  changeBrightness("#0469ad", percentBrighter, 1);
      } else {
        row.style.color = "#e74c3c";
      }
    }
  }

  static displayGenerationIndex() {
    document.getElementById('simulationConfigs').innerHTML = '';
    const para = document.createElement('p');
    const node = document.createTextNode('Generation : ' + globals.generationIndex);
    para.appendChild(node);
    document.getElementById('simulationConfigs').appendChild(para);
  }

  static displayBestHumanStats() {
    document.getElementById('bestHumanConfigs').innerHTML = '';
    const para = document.createElement('p');
    const para1 = document.createElement('p');
    const para2 = document.createElement('p');

    const bestScore = document.createTextNode('Best Score : ' + globals.bestHuman.score.toFixed(2));
    const mostDistanceTraveled = document.createTextNode('Best Distance : ' + globals.bestHuman.distanceTraveled.toFixed(2));
    const bestFinishTime = document.createTextNode('Best Finish Cycles : ' + globals.bestHuman.finishTime);

    para.appendChild(bestScore);
    para1.appendChild(mostDistanceTraveled);
    para2.appendChild(bestFinishTime);

    document.getElementById('bestHumanConfigs').appendChild(para);
    document.getElementById('bestHumanConfigs').appendChild(para1);
    document.getElementById('bestHumanConfigs').appendChild(para2);

  }

  static displayChart() {
    const labels = Array(globals.generationIndex)
      .fill(null)
      .map((x, i) => i + 1);
    const highScoreData = globals.generationHighScores;
    const avgScoreData = globals.generationAvgScores;
    var ctx = document.getElementById('chart').getContext('2d');
    var myChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
            label: 'High Score',
            data: highScoreData,
            fill: false,
            borderColor: '#9b59b6',
            backgroundColor: '#9b59b6',
            borderDash: [3, 1],
            pointRadius: 1,
            pointHoverRadius: 3,
          },
          {
            label: 'Average Score',
            data: avgScoreData,
            fill: true,
            borderColor: '#3498db',
            backgroundColor: '#3498db',
            pointRadius: 0,
            pointHoverRadius: 0,
          }
        ],
      },
      options: {
        events: [],
        animation: false,
        responsive: true,
        tooltips: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          xAxes: [{
            display: true,
            scaleLabel: {
              display: true,
              labelString: 'Generation',
            },
          }, ],
          yAxes: [{
            display: true,
            scaleLabel: {
              display: true,
              labelString: 'Score',
            },
          }, ],
        },
      },
    });
  }
}