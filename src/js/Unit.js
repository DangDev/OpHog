( function() {

    // This represents a 2x1 unit. 496 was chosen because it's the first index
    // that doesn't correspond to a valid sprite.
    window.game.twoByOneUnit = 496;
    window.game.oneByTwoUnit = 497;
    window.game.twoByTwoUnit = 498;

    // Assign IDs for now to make debugging easier.
    window.game.unitID = 0;

    // This should always reflect the size of the widest unit. It's used by the
    // battle system's repositioning logic.
    window.game.LARGEST_UNIT_WIDTH = 2;

    /**
     * Creates a unit (player OR enemy).
     * @param {number}  tileX    X-coordinate (in tiles) to center on
     * @param {number}  tileY    Y-coordinate (in tiles) to center on
     * @param {number}  unitType For now, this is the graphic index, or one
     *                           of the special values above.
     * @param {Boolean} isPlayer True if this is a player unit.
     */
    window.game.Unit = function Unit(tileX, tileY, unitType, isPlayer) {
        this.unitType = unitType;
        this.width = tileSize;
        this.height = tileSize;
        this.widthInTiles = 1;
        this.heightInTiles = 1;
        this.id = window.game.unitID++;

        // You have a graphic index for each tile that you take up.
        // 'graphicIndexes' represents all of the tiles, from left to right, top
        // to bottom, to use when drawing a unit.
        //
        // For example,
        // A 2x2 monster may have indexes [0,5,19,24], which means to
        // draw them like this:
        // 0  5
        // 19 24
        // For an enemy, it would draw them horizontally flipped.
        this.graphicIndexes = new Array();

        if (unitType == window.game.twoByOneUnit) {
            this.width = tileSize * 2;
            this.graphicIndexes.push(240);
            this.graphicIndexes.push(241);
            this.widthInTiles = 2;
        } else if (unitType == window.game.oneByTwoUnit) {
            this.height = tileSize * 2;
            this.graphicIndexes.push(421);
            this.graphicIndexes.push(437);
            this.heightInTiles = 2;
        } else if (unitType == window.game.twoByTwoUnit) {
            this.width = tileSize * 2;
            this.height = tileSize * 2;
            this.graphicIndexes.push(302);
            this.graphicIndexes.push(303);
            this.graphicIndexes.push(318);
            this.graphicIndexes.push(319);
            this.widthInTiles = 2;
            this.heightInTiles = 2;
        } else {
            this.graphicIndexes.push(Math.floor(Math.random()*220));
        }

        this.areaInTiles = this.widthInTiles * this.heightInTiles;

        // Now that size is set, we can set the position. 'x' is in pixels and
        // is only snapped to a tile at creation
        var centerXPx = tileX * tileSize + tileSize / 2;
        var centerYPx = tileY * tileSize + tileSize / 2;
        this.setCenterX(centerXPx);
        this.setCenterY(centerYPx);

        this.isPlayer = isPlayer;

        // As soon as this is true, the unit will be removed from the game.
        this.removeFromGame = false;

        // This is an object with a lot of different things in it.
        this.battleData = null;
    };

    window.game.Unit.prototype.update = function(delta) {
        var deltaAsSec = delta / 1000;
        // var speed = Math.random()*120 + 500;
        // var speed = Math.random()*120 + 500;
        var speed = 600;
        var change = speed * deltaAsSec;
        if (!this.isInBattle()) {
            this.x += this.isPlayer ? change : -change;
        } else {
            this.updateBattle(delta);
        }
    };

    window.game.Unit.prototype.updateBattle = function(delta) {
        // Check to see if the battle already ended. This is possible if another
        // unit called updateBattle on the same game loop as this unit and
        // caused the battle to end.
        if ( this.battleData.battle.isDead() ) {
            return;
        }

        var deltaAsSec = delta / 1000;
        var speed = 300;
        var change = speed * deltaAsSec;
        var desiredX = this.battleData.desiredX;
        var desiredY = this.battleData.desiredY;

        if ( this.x < desiredX ) {
            if ( Math.abs(this.x - desiredX) < change ) {
                this.x = desiredX;
            } else {
                this.x += change;
            }
        } else {
            if ( Math.abs(this.x - desiredX) < change ) {
                this.x = desiredX;
            } else {
                this.x -= change;
            }
        }

        if ( this.y < desiredY ) {
            if ( Math.abs(this.y - desiredY) < change ) {
                this.y = desiredY;
            } else {
                this.y += change;
            }
        } else {
            if ( Math.abs(this.y - desiredY) < change ) {
                this.y = desiredY;
            } else {
                this.y -= change;
            }
        }

        var atDestination = ((this.x == desiredX) && (this.y == desiredY));

        // You only count down when you're at your destination and you're alive.
        // 
        // Hard-coding that this unit gets closer to its cooldown at 100 units
        // per second.
        if ( atDestination && this.isLiving() ) {
            var cooldownDifference = 100 * deltaAsSec;
            this.battleData.cooldown -= cooldownDifference;
            if ( this.battleData.cooldown <= 0 ) {
                // Also hard-coding the reset time to 200 units. Do this before
                // taking the turn in case the turn modifies the cooldown
                // somehow.
                this.battleData.cooldown = 200;

                this.takeBattleTurn();
            }
        }

    };

    /**
     * Attack, cast a spell, etc.
     * @return {null}
     */
    window.game.Unit.prototype.takeBattleTurn = function() {
        // Short hand
        var battle = this.battleData.battle;


        // Revive
        if ( (this.id % 15) == 0 ) {
            // There needs to be a dead unit for this to work.
            var flags = game.RandomUnitFlags.DEAD;
            if ( this.isPlayer ) {
                flags |= game.RandomUnitFlags.PLAYER_UNIT;
            } else {
                flags |= game.RandomUnitFlags.ENEMY_UNIT;
            }

            var targetUnit = battle.getRandomUnit(flags);
            if ( targetUnit != null ) {
                var newProjectile = new game.Projectile(this.getCenterX(), this.getCenterY(),1,this,targetUnit);
                battle.addProjectile(newProjectile);
                return;
            }
        }

        // Summon
        if ( !this.isPlayer && (this.id % 16) == 0 ) {
            // Create it at the center of the battle so that it's forced to join
            // this battle.
            var createX;
            var createY;
            if ( this.isPlayer ) {
                createX = Math.floor(battle.playerCenterX / tileSize);
                createY = Math.floor(battle.playerCenterY / tileSize);
            } else {
                createX = Math.floor(battle.enemyCenterX / tileSize);
                createY = Math.floor(battle.enemyCenterY / tileSize);
            }

            var newUnit = new game.Unit(createX,createY,0,this.isPlayer);
            newUnit.graphicIndexes = [224 + Math.floor(Math.random() * 5)];
            gameUnits.push(newUnit);
            return;
        }

        // First, acquire a living target of the opposite team
        var flags = game.RandomUnitFlags.ALIVE;
        if ( this.isPlayer ) {
            flags |= game.RandomUnitFlags.ENEMY_UNIT;
        } else {
            flags |= game.RandomUnitFlags.PLAYER_UNIT;
        }

        var targetUnit = battle.getRandomUnit(flags);

        var newProjectile = new game.Projectile(this.getCenterX(), this.getCenterY(),0,this,targetUnit);
        battle.addProjectile(newProjectile);
    };

    window.game.Unit.prototype.projectileCallback = function(projectile) {
        // Short hand
        var battle = this.battleData.battle;
        var targetUnit = projectile.target;

        if ( projectile.type == 0 ) {

            // Compute damage very simply
            var bonusDamage = Math.floor(Math.random() * this.battleData.atk * .5);

            var damage = this.battleData.atk + bonusDamage - targetUnit.battleData.def;
            damage = Math.max(0, damage);

            // Apply the damage
            targetUnit.battleData.life -= damage;

            var damageString = "" + Math.round(-1 * damage);

            var textObj = new game.TextObj(targetUnit.getCenterX(), targetUnit.y, damageString);
            game.TextManager.addTextObj(textObj);

            if ( !targetUnit.isLiving() ) {
                battle.unitDied(targetUnit);
            }
        } else {
            // If the target is already alive, then we don't do anything here.
            // This is better than just killing the projectile as soon as the
            // target is alive so that you can account for a case where two
            // units shoot a slot-moving revive spell at the same dead guy. The
            // first one might hit, then the unit might die again, and that's
            // when you'd want the second spell to be around still.
            if( targetUnit.isLiving() ) {
                return;
            }
            targetUnit.battleData.life = targetUnit.battleData.maxLife;
        }
    };

    /**
     * Returns true if this unit is alive.
     *
     * This function will not work if you're not in a battle.
     */
    window.game.Unit.prototype.isLiving = function() {
        return this.battleData.life > 0;
    };

    window.game.Unit.prototype.getCenterX = function() {
        return this.x + this.width / 2;
    };

    window.game.Unit.prototype.getCenterY = function() {
        return this.y + this.height / 2;
    };

    window.game.Unit.prototype.getTileX = function() {
        return Math.floor(this.x / tileSize);
    };

    window.game.Unit.prototype.getTileY = function() {
        return Math.floor(this.y / tileSize);
    };

    window.game.Unit.prototype.setCenterX = function(pixelX) {
        this.x = pixelX - this.width / 2;
    };

    window.game.Unit.prototype.setCenterY = function(pixelY) {
        this.y = pixelY - this.height / 2;
    };

    window.game.Unit.prototype.isInBattle = function() {
        return this.battleData != null;
    };

    window.game.Unit.prototype.isOffScreen = function() {
        return this.x < -tileSize || this.x > 25 * tileSize;
    };

    window.game.Unit.prototype.draw = function(ctx) {
        // Dead units always look like a 1x1 tombstone for now.
        if ( this.isInBattle() && !this.isLiving() ) {
            objSheet.drawSprite(ctx, 19, this.x, this.y, !this.isPlayer);
            return;                
        }

        if ( this.widthInTiles == 1 && this.heightInTiles == 1 ) {
            charSheet.drawSprite(ctx, this.graphicIndexes[0], this.x, this.y, !this.isPlayer);
            return;
        }

        if (this.widthInTiles == 2) {
            if (this.isPlayer) {
                charSheet.drawSprite(ctx, this.graphicIndexes[0], this.x, this.y, !this.isPlayer);
                charSheet.drawSprite(ctx, this.graphicIndexes[1], this.x + tileSize, this.y, !this.isPlayer);
            } else {
                charSheet.drawSprite(ctx, this.graphicIndexes[0], this.x, this.y, !this.isPlayer);
                charSheet.drawSprite(ctx, this.graphicIndexes[1], this.x - tileSize, this.y, !this.isPlayer);
            }
        }

        if (this.heightInTiles == 2) {
            if ( this.widthInTiles == 1 ) {
                charSheet.drawSprite(ctx, this.graphicIndexes[0], this.x, this.y, !this.isPlayer);
                charSheet.drawSprite(ctx, this.graphicIndexes[1], this.x, this.y + tileSize, !this.isPlayer);
            } else {
                if (this.isPlayer) {
                    charSheet.drawSprite(ctx, this.graphicIndexes[0], this.x, this.y, !this.isPlayer);
                    charSheet.drawSprite(ctx, this.graphicIndexes[1], this.x + tileSize, this.y, !this.isPlayer);
                    charSheet.drawSprite(ctx, this.graphicIndexes[2], this.x, this.y + tileSize, !this.isPlayer);
                    charSheet.drawSprite(ctx, this.graphicIndexes[3], this.x + tileSize, this.y + tileSize, !this.isPlayer);
                } else {
                    charSheet.drawSprite(ctx, this.graphicIndexes[0], this.x, this.y, !this.isPlayer);
                    charSheet.drawSprite(ctx, this.graphicIndexes[1], this.x - tileSize, this.y, !this.isPlayer);
                    charSheet.drawSprite(ctx, this.graphicIndexes[2], this.x, this.y + tileSize, !this.isPlayer);
                    charSheet.drawSprite(ctx, this.graphicIndexes[3], this.x - tileSize, this.y + tileSize, !this.isPlayer);
                }
            }
        }
    };

}());