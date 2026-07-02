const createFloor = () => {
  const floorDef = new b2.BodyDef();
  floorDef.type = b2.Body.b2_staticBody;
  floorDef.position.Set(config.floorX, config.floorY);

  const floorFixDef = new b2.FixtureDef();
  floorFixDef.density = 1;
  floorFixDef.restitution = 0.1;
  floorFixDef.friction = config.floorFriction;
  floorFixDef.shape = new b2.PolygonShape();
  floorFixDef.shape.SetAsBox(config.floorX, config.floorThickness);

  const floor = globals.world.CreateBody(floorDef);
  floor.CreateFixture(floorFixDef);
  return floor;
};