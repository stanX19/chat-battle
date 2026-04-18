# Actual game frame
## Define enemies
Square, Triangle, Hexagon, Big Polygon

Sizes: small, medium, large (boss)
Type: meele, ranged, sniper (with, low, mid, high vision range)

## Define enemy behavior
- Follow player if in scan range
- Shoot at player if in shoot range

## Define collectible items
Health pack, Shield, Speed boost, Attack boost, lazer, gun, sword

---

# Visuals

## Texture
Use math to introduce noice patterns onto everything (each have diff formula to have diff look) can overlap multiple formulas for each color added to create complex patterns. Add gaussian noise to create texture, add random animations of grid tiles (like the glitch) to walls globally.

## Attack
- Bullet should be spinning and have trail (triangle maybe) to represent particles
- Meele should have a swing shape, with light particles following the swing

## Movement
- Movement should also leave maybe a trail of particles
- When fast, trigger special animation that spawns even more particle, and shape shift

## Glitch
- When glitch value is high, the screen should shake, and the colors should shift towards red

---

# Rooms, traps and navigation

Some tiles are rooms, some rooms are traps that debuff player, very obvious. The mc should hesitate in front of them and ask "should i go in?" and player can command to go in or not. (only when there is no enemies)

Some room contain treasure that gives buff to player (maybe 3-4 buff stacked together)

Some room is empty, just decoration

Oh yeah the trap tile is a ROOM-X entity, so it should be in the list of selectable entity.

for explore, if all tiles are visited already, clear the visited list and start again, so mc can keep moving

---

# User control in normal mode

## Problem
Currently user using chat to control feels abit too hard, commands is hard to use.

## Solution
Normal mode allow user to use wasd and space (attack) to control mc, and chat is only for chat mode and rebel mode.

How does the mc know when to switch to rebel mode?
- The bar is a counter, the more distance the user moved, the more the bar fills up, when it's full, mc will enter chat mode
- Then chat mode will be current mode with the bar, but instead calculates distance moved by mc too. when the bar is full, mc will enter rebel personality
- in rebel personality, after it yields, we get back the control

Where does the talkative agent go in normal mode?
- We will add a new entity, a talkative sidekick that follows the mc around, and talks to the user. It can go up to 2 tiles away from mc to help collect collectibles

What about the textbox?
- In normal mode, the textbox is hidden, all keyboard goes to wasd and space (movement)
- In chat mode, the textbox is for the mc to talk to the user
- In rebel mode, the textbox is for the mc to talk to the user

## Aesthetics
It should be represented as if the sidekick has fused into the mc (sidekick ram into mc with particle effect) and is now controlling the body.

---

# Unify collectibles
## Old remnants
We had buff, potions, score buff, etc
- This is from old idea, we should remove it

We unify the game to only have the current cyan dots: materials.

## What are they?
- On ground, They are just cyan dots, no special shape, no special color, just cyan dots.
- When collected, they turn into "material" that surrounds the user with gravity like physics
- The material when collected, will give user hp, defense, and attack when following player. This is not permanant so probably need dynamic calculation
- when player attacks, it will follow user attack and launches itself at the target to deal extra damage, and then come back to player
- When the materials is used to attack, there are chances of it being lost forever (10% chance)
- if its lost, the buff provided to mc will decrease by the amount of material used to attack

## Purpose
- The purpose of this is to give player a reason to collect the cyan dots
- It also adds a layer of strategy to the game, as the player needs to decide when to attack and when to collect
- Most importantly, the llm no longer need to hallucinate "what" to target, it just need to decide if it needs to target "materials" or not

---

# Knockback physics and visuals

When getting attacked, depending on damage, the mc will be knocked back in the opposite direction of the attack. The amount of knockback will be proportional to the damage taken.

visuals: There will be particles shooting out of mc as a indicator of 'getting hurt' or 'blood'. The particles will slowly fade away over time.

---

# Shape shift

Automatically enter attack mode when enemies nearby, unless target is safety of "material"

for player controlled mode, it will automatically enter attack mode space is pressed, and exit attack mode after space is released for 3 seconds