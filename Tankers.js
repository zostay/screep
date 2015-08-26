var util = require('util');
var Creeps = require('Creeps');

function Tankers(mon, creeps) {
    this.memoryKey  = 'Tankers';
    this.nullSource = false;
    this.nullTarget = false;
    Creeps.call(this, mon, creeps);
}
Tankers.prototype = new Creeps;

Tankers.prototype.initCreep = function (creep) {
    creep.memory.role   = 'tanker';
    creep.memory.state  = creep.memory.state || 'gather';

    // TODO Do I want to do this or is this taken care of by gather already?
    // creep.memory.source = creep.memory.source || null;
    // if (!creep.memory.source) this.memory.nullSource = true;

    creep.memory.target = creep.memory.target || null;
    if ((creep.memory.state == 'deliver' || creep.memory.state == 'idle') && !creep.memory.target)
        this.memory.nullTarget = true;
}

Tankers.prototype.listTargets = function (creep, n) {
    if (n == 0) {
        return this.listSpawns(creep);
    }
    else if (n == 1) {
        return this.listExtensions(creep);
    }
    else if (n == 2) {
        return this.listWorkers(creep);
    }
    else {
        return null;
    }
}

Tankers.prototype.listSpawns = function (creep) {
    return this.mon.findSpawnsNeedingEnergy(creep.room);
}

Tankers.prototype.listExtensions = function (creep) {
    return this.mon.findExtensionsNeedingEnergy(creep.room);
}

Tankers.prototype.listCreeps = function (creep) {
    var creeps = mon.findMyCreeps(creep.room).filter(
        function (c) {
            return (
                c.memory.role == 'builder'
                || c.memory.role == 'keeper'
            )
            && c.carry.energy < c.carryCapacity
            && c.carry.energy > 5; // they aren't gathering yet
        }
    );

    return creeps;
}

Tankers.prototype.assignTargets = function () {
    if (!this.creeps.length) return;

    console.log('Tankers: Assigning Targets');

    function sortByDistance(list, creep) {
        var distance   = {};
        var energyNeed = {};
        list.forEach(function (t) {
            distance[ t.id ] = util.crowDistance(creep.pos, t.pos);
            if (t.carry)
                energyNeed[ t.id ] = t.carryCapacity - t.carry.energy;
            else
                energyNeed[ t.id ] = t.energyCapacity - t.energy;
        });
        list.sort(function(a, b) {
            return   distance[a.id] - distance[b.id]
                || energyNeed[b.id] - energyNeed[a.id]
        });
    }

    var iteration = 0;
    var targets = null;
    var triedSecondary = false;
    var i = 0;
    for (var n in this.creeps) {
        var creep = this.creeps[n];
        if (creep.memory.target) continue;

        if (!targets || targets.length == 0)
            targets = this.listTargets(creep, iteration++);

        if (!targets) {
            creep.memory.target = null;
            creep.memory.state  = 'idle';
        }
        else {
            sortByDistance(targets, creep);

            creep.memory.target = targets.shift();
            creep.memory.state  = 'deliver';
        }
    }
}

Tankers.prototype.behave = function () {
    if (this.memory.nullTarget) {
        this.assignTargets();
    }

    Creeps.prototype.behave.call(this);
}

Tankers.prototype.states = Object.create(Creeps.prototype.states);
Tankers.prototype.states.deliver = function (creep) {
    if (creep.carry.energy == 0) {
        creep.say("Gather");
        creep.memory.target = null;
        creep.memory.state = 'gather';
    }
    else {
        if (!creep.memory.target) {
            creep.memory.state = 'idle';
        }
        else {
            var targetObj = Game.getObjectById(creep.memory.target);

            if (!targetObj) {
                creep.memory.target = null;
                creep.memory.state = 'idle';
            }
            else {
                creep.moveTo(targetObj);
                creep.transferEnergy(targetObj);
            }
        }
    }
}

Tankers.prototype.states.gather = function (creep) {
    util.gather(this.mon, creep, 'deliver', 'Deliver');
}

module.exports = Tankers;