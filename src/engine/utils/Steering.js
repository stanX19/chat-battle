import { 
  CELL_SIZE, 
  HERO_MAX_SPEED, 
  HERO_STEER_FORCE,
  ARCHETYPES 
} from '../Constants';

export const steering = {
  seek: (actor, target, maxSpeed = HERO_MAX_SPEED) => {
    const desired = { x: target.x - (actor.pos ? actor.pos.x : actor.x), y: target.y - (actor.pos ? actor.pos.y : actor.y) };
    const ax = actor.pos ? actor.pos.x : actor.x;
    const ay = actor.pos ? actor.pos.y : actor.y;
    const dist = Math.hypot(desired.x, desired.y);
    if (dist < 5) return { x: 0, y: 0 };
    desired.x = (desired.x / dist) * maxSpeed;
    desired.y = (desired.y / dist) * maxSpeed;
    return { x: desired.x - actor.vel.x, y: desired.y - actor.vel.y };
  },
  fleeWeighted: (actor, entities, maxSpeed = HERO_MAX_SPEED) => {
    let combinedX = 0;
    let combinedY = 0;
    const ax = actor.pos ? actor.pos.x : actor.x;
    const ay = actor.pos ? actor.pos.y : actor.y;
    
    entities.forEach(e => {
      const dx = ax - e.x;
      const dy = ay - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) return;
      
      let typeWeight = 1.0;
      if (e.type === 'BOSS') typeWeight = 5.0;
      else if (e.type === 'RANGED') typeWeight = 2.0;
      
      const weight = dist * typeWeight;
      combinedX += (dx / dist) * weight;
      combinedY += (dy / dist) * weight;
    });
    
    const mag = Math.hypot(combinedX, combinedY);
    if (mag < 0.1) return { x: 0, y: 0 };
    
    const desiredX = (combinedX / mag) * maxSpeed;
    const desiredY = (combinedY / mag) * maxSpeed;
    return { x: desiredX - actor.vel.x, y: desiredY - actor.vel.y };
  }
};
