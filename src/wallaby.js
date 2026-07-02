const B = 1; // base length in meters
const W = 0.025 * B; // width
const CG = 0.2 * B; // center of gravity
const M = 1; // total mass kilograms
const P = 2; // density (kilograms per meter squared)

const bodyDef = {
  head: {
    height: 2 * 0.21 * B,
    width: 0.5 * W
  },
  neck: {
    height: 1.5 * W,
    width: 0.14 * B
  },
  base: {
    height: 2 * W,
    width: B
  },
  frontLeg: {
    height: B * 0.32,
    width: 1.2 * W,
    offsetX: B / 2 - 0.1 * B,
    enableMotor: true,
    positiveLimitRadians: Math.PI / 4,
    negativeLimitRadians: Math.PI / 3,
  },
  backLeg: {
    height: B * 0.23,
    width: 1.2 * W,
    offsetX: B / 2 - 0.37 * B,
    enableMotor: true,
    positiveLimitRadians: Math.PI / 3,
    negativeLimitRadians: Math.PI / 4,
  },
  frontFoot: {
    height: W,
    width: 0.1 * B,
    offsetX: -1 * B * 0.025,
  },
  backFoot: {
    height: W,
    width: 0.1 * B,
    offsetX: B * 0.025,
  },
  tail: {
    height: 1.5 * W,
    width: 0.14 * B,
    overhang: 0.005 * B
  },
};

class Human {
  constructor(x, y, genome) {
    this.x = x;
    this.y = y;
    this.density = P;
    this.centerOfGravity = CG;
    this.finishLineX = 7.25;
    this.genomes = [];
    this.joints = [];
    this.maxDistance = x;
    this.distanceTraveled = 0;
    this.distancePerClockStep = 0;
    this.finishTime = NaN;
    this.score = 0;
    this.isAlive = true;
    this.isFinisher = false;
    this.fitness = 0;
    this.bodyDelta = 0;
    this.legDelta = 0;
    this.tailDelta = 0;
    this.totalMass = 0;
    this.masses = this.getComponentMasses();

    // General Body Defintion
    this.bodyDef = new b2.BodyDef();
    this.bodyDef.type = b2.Body.b2_staticBody;
    this.bodyDef.type = b2.Body.b2_dynamicBody;
    this.bodyDef.linearDamping = 0;
    this.bodyDef.angularDamping = 0.01;
    this.bodyDef.allowSleep = true;
    this.bodyDef.awake = true;

    // General Fixture Definition
    this.fixtureDef = new b2.FixtureDef();
    this.fixtureDef.density = this.density;
    this.fixtureDef.restitution = 0.1;
    this.fixtureDef.friction = 0.8;
    this.fixtureDef.shape = new b2.PolygonShape();
    this.fixtureDef.filter.groupIndex = -1;

    // Create body parts and joints
    this.bodyParts = this.createBodyParts();
    this.joints = this.createBodyJoints();

    // Create genome based on number of joints
    if (genome) {
      this.genome = JSON.parse(JSON.stringify(genome));
    } else {
      this.genome = this.createGenomes();
    }
    console.log('Front Leg Genome: ', this.genome[0]);
    console.log('Back Leg Genome: ', this.genome[1]);

  }

  static isTouchingGround(body) {
    const fixture = body.GetFixtureList();
    const shape = fixture.GetShape();
    for (let i = 0; i < 4; i += 1) {
      const {
        y
      } = body.GetWorldPoint(shape.m_vertices[i]);
      if (y >= config.floorY - 2 * config.floorThickness) return true;
    }
  }

  //////////////////////////////////
  // Simulation Related Functions //
  //////////////////////////////////

  assignScore() {
    const currentMaxDistance = this.maxDistance;
    const currentDistance = this.base.GetWorldCenter().x;
    const newMaxDistance = Math.max(currentMaxDistance, currentDistance);
    const headHeightDelta = this.head.GetPosition().y;
    const distanceDelta = currentDistance - currentMaxDistance;
    const footHeightDelta = Math.max(this.frontFoot.GetPosition().y, this.backFoot.GetPosition().y);
    this.tailDelta = footHeightDelta - this.tail.GetPosition().y;
    this.bodyDelta = footHeightDelta - headHeightDelta;
    this.legDelta = this.frontFoot.GetPosition().x - this.backFoot.GetPosition().x;
    // console.log("Body Delta: " + this.bodyDelta)
    // console.log("Tail Delta: " + this.tailDelta)
    // console.log("Leg Delta: " + this.legDelta)
    // console.log("Distance Delta: " + distanceDelta)
    // console.log(this.frontFoot.GetPosition().x, this.frontFoot.GetPosition().y, this.backFoot.GetPosition().x, this.backFoot.GetPosition().y);
    
    // Bonus for early finishers.
    if (this.checkIfFinisher()) {
      this.score += 100 * config.populationSize / Math.max(1, globals.finishedHumans);
      this.finishTime = globals.stepCounter;
      this.score *= 1+this.distancePerClockStep;
      this.isAlive = false;
      return
    }

    if (this.bodyDelta > config.minBodyDelta) {
      if (distanceDelta > 0) {
        this.score += this.bodyDelta / config.minBodyDelta;
        this.maxDistance = newMaxDistance;
        if (Math.abs(this.legDelta) < config.maxLegDelta) {
          this.score += Math.abs(this.legDelta);

          // Both Legs and tail  must touch the ground
          this.distanceTraveled = currentDistance;
          this.distancePerClockStep = currentDistance;
          if (globals.stepCounter > 0) {
            this.distancePerClockStep = currentDistance / globals.stepCounter;
          }
          // console.log(100*this.distancePerClockStep);
          
          if (Human.isTouchingGround(this.frontFoot) && Human.isTouchingGround(this.backFoot)) {
            // this.legDeltaSign = this.legDelta / Math.abs(this.legDelta);
            this.score += 100*this.distancePerClockStep + this.distanceTraveled;

          }

          // Subtract from score if tail off ground.
          if (!Human.isTouchingGround(this.tail)) {
            this.score -= 10 * this.tailDelta;
            // console.log("Tail bouncing penalty: ", 10*this.tailDelta);
          }

          // Penalize for non moving leg
          for (let i = 0; i < this.genome.length; i += 1) {
            let absAmplitude = Math.abs(this.genome[i].amplitude);
            if (absAmplitude < config.minAmplitude) {
              this.score -= 10*absAmplitude;
              console.log("Static leg penalty: ", 10*absAmplitude);
            }
          }
        } else {
          this.score -= 10*Math.abs(this.legDelta);
          // console.log("Legs delta penalty: ", 10*Math.abs(this.legDelta));
        }
      } else {
        this.score += distanceDelta * 0.1;
      }
    } else {
      this.score -= Math.abs(this.bodyDelta) * 100;
      // console.log("Body touching foot penalty: ", 100*this.bodyDelta);
    }
  }

  walk(motorNoise) {

    for (let i = 0; i < this.genome.length; i += 1) {
      const amp = (1 + motorNoise * (Math.random() * 2 - 1)) * this.genome[i].amplitude;
      const freq = (1 + motorNoise * (Math.random() * 2 - 1)) * this.genome[i].frequency;
      const phase = (1 + motorNoise * (Math.random() * 2 - 1)) * this.genome[i].phase;
      const speed = amp * Math.cos(phase + freq * globals.stepCounter);
      // if ( globals.stepCounter % 1000 == 0) {
      //   console.log('Genome: ', i, this.genome[i]);
      // }

      this.joints[i].SetMotorSpeed(speed);
    }
  }

  checkStillAlive() {
    if (Human.isTouchingGround(this.head)) {
      return true;
    }
  }

  checkIfFinisher() {
    if (this.base.GetWorldCenter().x > this.finishLineX) {
      return true;
    }
  }
  createGenomes() {
    const genome = [];
    this.joints.forEach(() => {
      genome.push({
        amplitude:  config.maxAmplitude * (2*Math.random() - 1),
        frequency: config.maxFrequency * Math.random(),
        phase:  Math.random() * Math.PI * 2
      });
    });
    return genome;
  }

  getComponentMasses() {
    let masses = {};
    for (const key in bodyDef) {
      if ('height' in bodyDef[key] && 'width' in bodyDef[key]) {
        masses[key] = this.density * bodyDef[key].height * bodyDef[key].width;
        this.totalMass += masses[key];
      }
    }
    // Set neck and tail mass to fulfill center of gravity location constraint
    const addedMass = M - this.totalMass;
    const neckToCenter = this.centerOfGravity + bodyDef.neck.width / 2;
    const tailToCenter = bodyDef.base.width - this.centerOfGravity - bodyDef.tail.width / 2;
    masses.neck += (1 - neckToCenter / tailToCenter) * addedMass;
    masses.tail += (neckToCenter / tailToCenter) * addedMass;
    this.totalMass += addedMass;
    console.log('Body has total mass: ', this.totalMass, ' Center of gravity: ', this.centerOfGravity);
    console.log('Masses :', masses);
    return masses;
  }
  ////////////
  // Bodies //
  ////////////

  createBodyParts() {
    this.base = this.createBase();
    this.head = this.createHead();
    this.neck = this.createNeck();
    this.frontLeg = this.createFrontLeg();
    this.backLeg = this.createBackLeg();
    this.frontFoot = this.createFrontFoot();
    this.backFoot = this.createBackFoot();
    this.tail = this.createTail();
    return [this.base, this.head, this.neck, this.frontLeg, this.backLeg, this.frontFoot, this.backFoot, this.tail];
  }

  createHead() {
    this.bodyDef.position.Set(
      this.x + bodyDef.base.width / 2 + bodyDef.neck.width - bodyDef.head.width / 2,
      this.y + bodyDef.neck.height / 2
    );
    const head = globals.world.CreateBody(this.bodyDef);
    this.fixtureDef.shape.SetAsBox(bodyDef.head.width / 2, bodyDef.head.height / 2);
    this.fixtureDef.density = 1; // head should have trivial mass to preseve CG
    head.CreateFixture(this.fixtureDef);
    return head;
  }

  createNeck() {
    this.bodyDef.position.Set(
      this.x + bodyDef.base.width / 2 + bodyDef.neck.width / 2,
      this.y + bodyDef.base.height / 2
    );
    const neck = globals.world.CreateBody(this.bodyDef);
    this.fixtureDef.shape.SetAsBox(bodyDef.neck.width / 2, bodyDef.neck.height / 2);
    this.fixtureDef.density = this.masses.neck / (bodyDef.neck.width * bodyDef.neck.height);
    neck.CreateFixture(this.fixtureDef);
    return neck;
  }

  createBase() {
    this.bodyDef.position.Set(this.x, this.y + bodyDef.base.height / 2);
    const base = globals.world.CreateBody(this.bodyDef);
    this.fixtureDef.shape.SetAsBox(bodyDef.base.width / 2, bodyDef.base.height / 2);
    base.CreateFixture(this.fixtureDef);
    return base;
  }

  createFrontLeg() {
    this.bodyDef.position.Set(
      this.x + bodyDef.frontLeg.offsetX,
      this.y + bodyDef.base.height + bodyDef.frontLeg.height / 2
    );
    const leg = globals.world.CreateBody(this.bodyDef);
    this.fixtureDef.shape.SetAsBox(bodyDef.frontLeg.width / 2, bodyDef.frontLeg.height / 2);
    leg.CreateFixture(this.fixtureDef);
    return leg;
  }

  createBackLeg() {
    this.bodyDef.position.Set(
      this.x + bodyDef.backLeg.offsetX,
      this.y + bodyDef.base.height + bodyDef.backLeg.height / 2
    );
    const leg = globals.world.CreateBody(this.bodyDef);
    this.fixtureDef.shape.SetAsBox(bodyDef.backLeg.width / 2, bodyDef.backLeg.height / 2);
    leg.CreateFixture(this.fixtureDef);
    return leg;
  }

  createFrontFoot() {
    this.bodyDef.position.Set(
      this.x + bodyDef.frontLeg.offsetX + bodyDef.frontFoot.offsetX,
      this.y + bodyDef.base.height + bodyDef.frontLeg.height - bodyDef.frontFoot.height / 2
    );
    const foot = globals.world.CreateBody(this.bodyDef);
    this.fixtureDef.shape.SetAsBox(bodyDef.frontFoot.width / 2, bodyDef.frontFoot.height / 2);
    foot.CreateFixture(this.fixtureDef);
    return foot;
  }

  createBackFoot() {
    this.bodyDef.position.Set(
      this.x + bodyDef.backLeg.offsetX + bodyDef.backFoot.offsetX,
      this.y + bodyDef.base.height + bodyDef.backLeg.height - bodyDef.backFoot.height / 2
    );
    const foot = globals.world.CreateBody(this.bodyDef);
    this.fixtureDef.shape.SetAsBox(bodyDef.backFoot.width / 2, bodyDef.backFoot.height / 2);
    foot.CreateFixture(this.fixtureDef);
    return foot;
  }

  createTail() {
    this.bodyDef.position.Set(
      this.x - bodyDef.base.width / 2 - bodyDef.tail.overhang + bodyDef.tail.width / 2,
      this.y + bodyDef.base.height / 2
    );
    const tail = globals.world.CreateBody(this.bodyDef);
    this.fixtureDef.shape.SetAsBox(bodyDef.tail.width / 2, bodyDef.tail.height / 2);
    this.fixtureDef.density = this.masses.tail / (bodyDef.tail.width * bodyDef.tail.height);
    tail.CreateFixture(this.fixtureDef);
    return tail;
  }
  ////////////
  // Joints //
  ////////////

  createBodyJoints() {
    this.headNeckJoint = this.createHeadNeckJoint();
    this.neckBaseJoint = this.createBaseExtensionJoint(this.neck);
    this.frontLegBaseJoint = this.createFrontLegBaseJoint();
    this.backLegBaseJoint = this.createBackLegBaseJoint();
    this.frontFootJoint = this.createFrontLegFootJoint();
    this.backFootJoint = this.createBackLegFootJoint();
    this.tailBaseJoint = this.createBaseExtensionJoint(this.tail);

    return [this.frontLegBaseJoint, this.backLegBaseJoint];
  }

  createBaseExtensionJoint(ext) {
    const jointDef = new b2.RevoluteJointDef();
    const anchorPoint = ext.GetWorldCenter().Clone();
    jointDef.Initialize(ext, this.base, anchorPoint);
    jointDef.maxMotorTorque = config.maxTorque;
    jointDef.motorSpeed = 0;
    jointDef.enableMotor = false;
    jointDef.enableLimit = true;
    jointDef.lowerAngle = 0;
    jointDef.upperAngle = 0;
    return globals.world.CreateJoint(jointDef);
  }

  createHeadNeckJoint() {
    const jointDef = new b2.RevoluteJointDef();
    const anchorPoint = this.head.GetWorldCenter().Clone();
    jointDef.Initialize(this.head, this.neck, anchorPoint);
    jointDef.maxMotorTorque = config.maxTorque;
    jointDef.motorSpeed = 0;
    jointDef.enableMotor = false;
    jointDef.enableLimit = true;
    jointDef.lowerAngle = 0;
    jointDef.upperAngle = 0;
    return globals.world.CreateJoint(jointDef);
  }

  createFrontLegBaseJoint() {
    const jointDef = new b2.RevoluteJointDef();
    const anchorPoint = this.base.GetPosition().Clone();
    anchorPoint.y += bodyDef.base.height / 2;
    anchorPoint.x += bodyDef.frontLeg.offsetX;
    jointDef.Initialize(this.base, this.frontLeg, anchorPoint);
    jointDef.maxMotorTorque = config.maxTorque;
    jointDef.motorSpeed = 0;
    jointDef.enableMotor = bodyDef.frontLeg.enableMotor;
    jointDef.enableLimit = true;
    jointDef.lowerAngle = -1 * bodyDef.frontLeg.positiveLimitRadians;
    jointDef.upperAngle = bodyDef.frontLeg.negativeLimitRadians;
    return globals.world.CreateJoint(jointDef);
  }

  createFrontLegFootJoint() {
    const jointDef = new b2.RevoluteJointDef();
    const anchorPoint = this.frontLeg.GetWorldCenter().Clone();
    anchorPoint.y += bodyDef.frontFoot.height / 2 + bodyDef.frontLeg.height / 2;
    jointDef.Initialize(this.frontLeg, this.frontFoot, anchorPoint);
    jointDef.maxMotorTorque = config.maxTorque;
    jointDef.motorSpeed = 0;
    jointDef.enableMotor = false;
    jointDef.enableLimit = true;
    jointDef.lowerAngle = 0;
    jointDef.upperAngle = 0;
    return globals.world.CreateJoint(jointDef);
  }

  createBackLegBaseJoint() {
    const jointDef = new b2.RevoluteJointDef();
    const anchorPoint = this.base.GetPosition().Clone();
    anchorPoint.y += bodyDef.base.height / 2;
    anchorPoint.x += bodyDef.backLeg.offsetX;
    jointDef.Initialize(this.base, this.backLeg, anchorPoint);
    jointDef.maxMotorTorque = config.maxTorque;
    jointDef.motorSpeed = 0;
    jointDef.enableMotor = bodyDef.backLeg.enableMotor;
    jointDef.enableLimit = true;
    jointDef.lowerAngle = -1 * bodyDef.backLeg.positiveLimitRadians;
    jointDef.upperAngle = bodyDef.backLeg.negativeLimitRadians;
    return globals.world.CreateJoint(jointDef);
  }

  createBackLegFootJoint() {
    const jointDef = new b2.RevoluteJointDef();
    const anchorPoint = this.backLeg.GetWorldCenter().Clone();
    anchorPoint.y += bodyDef.backFoot.height / 2 + bodyDef.backLeg.height / 2;
    jointDef.Initialize(this.backLeg, this.backFoot, anchorPoint);
    jointDef.maxMotorTorque = config.maxTorque;
    jointDef.motorSpeed = 0;
    jointDef.enableMotor = false;
    jointDef.enableLimit = true;
    jointDef.lowerAngle = 0;
    jointDef.upperAngle = 0;
    return globals.world.CreateJoint(jointDef);
  }

  display() {
    fill('#8e44ad');
    drawRect(this.frontFoot);
    drawRect(this.frontLeg);

    fill('#7f8c8d');
    drawRect(this.neck);
    drawRect(this.tail);
    drawRect(this.head);

    fill('#');

    fill('#3498db');
    drawRect(this.base);

    fill('#9b59b6');
    drawRect(this.backLeg);
    drawRect(this.backFoot);
  }
}