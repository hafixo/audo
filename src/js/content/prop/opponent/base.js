content.prop.opponent.base = engine.prop.base.invent({
  name: 'opponent/base',
  onConstruct: function ({
    index,
  }) {
    this.index = index

    this.buildAeroSynth()
    this.buildToneSynth()
  },
  onUpdate: function () {
    const velocityRatio = Math.min(1, Math.abs(this.velocity) / 10)

    this.updateAeroSynth(velocityRatio)
    this.updateCollisionSynth()
    this.updateToneSynth(velocityRatio)
  },
  buildAeroSynth: function () {
    this.aeroSynth = engine.audio.synth.createBuffer({
      buffer: engine.audio.buffer.noise.pink(),
    }).filtered().connect(this.output.input)

    this.aeroSynth.param.gain.value = engine.utility.fromDb(-6)
    this.aeroSynth.filter.frequency.value = 250
  },
  updateAeroSynth: function (velocityRatio) {
    this.aeroSynth.filter.frequency.value = engine.utility.lerp(250, 1000, velocityRatio)
  },
  buildCollisionSynth: function () {
    const note = 60 + this.index
    const frequency = engine.utility.midiToFrequency(note)

    this.collisionSynth = engine.audio.synth.createMod({
      amodDepth: 0.5,
      amodFrequency: 1,
      amodType: 'triangle',
      carrierFrequency: frequency,
      carrierGain: 0.5,
      carrierType: 'sawtooth',
      fmodDepth: frequency / 2,
      fmodFrequency: frequency / 2,
      fmodType: 'sawtooth',
    }).filtered({
      frequency: frequency * 2,
    }).connect(this.output.input)
  },
  destroyCollisionSynth: function () {
    this.collisionSynth.stop().disconnect()
    delete this.collisionSynth
  },
  updateCollisionSynth: function () {
    const position = engine.position.get()

    const yDistance = Math.abs(this.y - position.y)
    let collisionChance = engine.utility.clamp(engine.utility.scale(yDistance, this.radius, this.radius * 4, 1, 0), 0, 1)

    if (
      collisionChance
      && (
           (this.velocity > 0 && this.x > 0)
        || (this.velocity < 0 && this.x < 0)
      )
    ) {
      collisionChance = 1 - Math.min(1, this.distance / Math.abs(this.velocity))
    }

    if (!collisionChance) {
      if (this.collisionSynth) {
        this.destroyCollisionSynth()
      }
      return
    }

    if (!this.collisionSynth) {
      this.buildCollisionSynth()
    }

    const reactionTime = 10
    const reactionDistance = reactionTime * Math.abs(this.velocity)
    const reactionCompensation = -engine.utility.toDb(engine.utility.distanceToPower(reactionDistance)) / 4

    const compensation = engine.utility.fromDb(
      this.distance < reactionDistance
        ? Math.max(0, reactionCompensation * this.distance / reactionDistance)
        : reactionCompensation
    )

    this.collisionSynth.param.amod.frequency.value = engine.utility.lerp(4, 8, collisionChance)
    this.collisionSynth.param.fmod.depth.value = collisionChance * this.collisionSynth.param.frequency.value
    this.collisionSynth.param.fmod.frequency.value = collisionChance * this.collisionSynth.param.frequency.value
    this.collisionSynth.param.gain.value = collisionChance * compensation
  },
  buildToneSynth: function () {
    const frequency = engine.utility.midiToFrequency(36 + this.index)

    this.toneSynth = engine.audio.synth.createSimple({
      frequency,
      type: 'square',
    }).filtered({
      frequency: frequency * 8,
    }).connect(this.output.input)

    this.toneSynth.param.gain.value = engine.utility.fromDb(-3)
  },
  updateToneSynth: function (velocityRatio) {
    this.toneSynth.param.detune.value = engine.utility.lerp(0, 1200, velocityRatio)
  },
})
