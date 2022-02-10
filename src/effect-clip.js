import effectInit from './lib/effect-init.js'
import effectTarget from './lib/effect-target.js'
import effectVirtualTransitionEnd from './lib/effect-virtual-transition-end.js'

const transitionSegments = {
	/** Last defined (never NaN) segment that differs from currSegment. */
	prevSegment: undefined,
	/** Last segment (can be NaN). */
	currSegment: undefined,
	/** Last defined (never NaN) segment. */
	get lastSegment() { return (this.currSegment == undefined || !this.currSegment.isNaN()) ? this.currSegment : this.prevSegment },
	/** Set new segment. */
	setSegment(segment) {
		if (this.currSegment != undefined && segment.equals(this.currSegment)) return '='
		if (this.currSegment != undefined && segment.reverse(this.currSegment)) { this.currSegment = segment; return '~' }
		if (this.currSegment == undefined || !this.currSegment.isNaN()) this.prevSegment = this.currSegment // Make sure not to set prevSegment to NaN.
		this.currSegment = segment; return '+'
	},
}

function transitionSegment(active, second) {
	active = (active == undefined) ? NaN : active
	second = (second == undefined) ? active + 1 : second
	return {
		active, second,
		slides: [ active, second ],
		includes: function(index) { return this.slides.includes(index) },
		equals: function(segment) { return this.active === segment.active && this.second === segment.second },
		reverse: function(segment) { return this.active === segment.second && this.second === segment.active },
		equivalent: function(segment) { return this.equals(segment) || this.reverse(segment) },
		isNaN: () => isNaN(active) || isNaN(second),
	}
}

export default function EffectClip({ swiper, extendParams, on }) {
	
	extendParams({ clipEffect: { transformEl: null } })

	transitionSegments.setSegment(transitionSegment(1))

	const setTranslate = () => {
		
		const { slides } = swiper
		const params = swiper.params.clipEffect

		const { active, second: _second } = clipped(swiper)
		const second = !isNaN(_second) ? _second : transitionSegments.lastSegment.second
		const activeProgress = swiper.slides.eq(active)[0].progress

		/** Keep track of previous transition segments */
		transitionSegments.setSegment(transitionSegment(active, _second))
		// console.log({ active, second, activeProgress })

		for (let i = 0; i < slides.length; i += 1) {
			
			const $slide = swiper.slides.eq(i)
			const slide = $slide[0]
			
			// Arrange slides one above the other (by default they are in line)
			const offset = slide.swiperSlideOffset
			const [ tx, ty ] = [ -offset, 0 ]
			if (!swiper.params.virtualTranslate) tx -= swiper.translate
			if (!swiper.isHorizontal()) { ty = tx; tx = 0 }
			
			const progress = slide.progress

			const zIndex = (() => {
				if (i === active) return 1
				if (i === second) return 0
				return -1
			})()

			const cssBound = (bound) => (bound * 100).toFixed(2)
			const filled = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
			const rightClipPath = (cssBound) => `polygon(0% 0%, ${100-cssBound}% 0%, ${100-cssBound}% 100%, 0% 100%)`
			const leftClipPath = (cssBound) => `polygon(${cssBound}% 0%, 100% 0%, 100% 100%, ${cssBound}% 100%)`

			const slideClipPath = (() => {
				if (i === active && activeProgress === 0) return filled
				if (i === active && activeProgress > 0) return rightClipPath(cssBound(activeProgress))
				if (i === active && activeProgress < 0) return leftClipPath(cssBound(-activeProgress))
				if (i === second && activeProgress === 0) return filled
				if (i === second && activeProgress > 0) return leftClipPath(cssBound(1-activeProgress))
				if (i === second && activeProgress < 0) return rightClipPath(cssBound(1+activeProgress))
				if (progress >= activeProgress) return rightClipPath(cssBound(1))
				if (progress <= activeProgress) return leftClipPath(cssBound(1))
			})()

			const visibility = ((i === active) || (i === second)) ? 'visible' : 'hidden'

			effectTarget(params, $slide)
				.css({ zIndex: zIndex, clipPath: slideClipPath, visibility })
				.transform(`translate3d(${tx}px, ${ty}px, 0px)`)

		}

	}

	const setTransition = (duration) => {
		const { transformEl } = swiper.params.clipEffect
		const $transitionElements = transformEl ? swiper.slides.find(transformEl) : swiper.slides
		$transitionElements.transition(duration)
		effectVirtualTransitionEnd({ swiper, duration, transformEl, allSlides: true })
	}

	effectInit({
		effect: 'clip',
		swiper,
		on,
		setTranslate,
		setTransition,
		overwriteParams: () => ({
			slidesPerView: 1,
			slidesPerGroup: 1,
			watchSlidesProgress: true,
			spaceBetween: 0,
			virtualTranslate: !swiper.params.cssMode,
		}),
	})

}

/**
 * Find original index of potentially duplicate slide.
 * 
 * Example: [*0*, 1, 2, 3, 4, *5*].map(original) = [4, 1, 2, 3, 4, 1]
 * 
 * @param {Object} swiper Swiper instance.
 * @param {Number} index Slide to find original index of.
 */
 function original(swiper, index) {
	const oneSideLooped = swiper.loopedSlides || 0
	const real = swiper.slides.length - oneSideLooped * 2
	const mod = (n, m) => ((n % m) + m) % m
	return mod(index - oneSideLooped, real) + oneSideLooped
}

/**
 * Find two slides that need to be clipped. Second slide can be unknown (NaN).
 * @param {Swiper} swiper Swiper instance.
 * @returns Active slide and second slide.
 */
 function clipped(swiper) {
	// Active slide can always be found
	const active = activeIndex(swiper)
	const activeProgress = swiper.slides.eq(active)[0].progress

	// Edge cases, when transition direction is unknown
	if (activeProgress === 0) return { active, second: NaN }

	// Find another slide with progress in (-1, 1) range 
	var second = [...swiper.slides].findIndex((slide, index) => 
		index != active && (activeProgress > 0
			? slide.progress > -1 && slide.progress <= 0
			: slide.progress >= 0 && slide.progress < 1))

	// If such slide doesn't exist – we went out of swiper.progress bounds
	// Either swiper.progress > 1 (activeProgress > 0), or swiper.progress < 0 (activeProgress < 0)
	if (second === -1)
		second = activeProgress > 0
			? original(swiper, original(swiper, swiper.slides.length - 1) + 1)
			: original(swiper, original(swiper, 0) - 1)
	
	return { active, second }
}

/**
 * Get index of active Swiper slide.
 * @description Sometimes swiper.activeIndex returns a slide with progress outside [-1, 1] range.
 * Not sure if this is intended, but it's undesired and addressed in this function.
 * @param {Swiper} swiper Swiper instance.
 * @returns {Number} Index of active Swiper slide.
 */
function activeIndex(swiper) {
	const _activeIndex = swiper.activeIndex
	const _activeProgress = swiper.slides.eq(_activeIndex)[0].progress
	if (Math.abs(_activeProgress) <= 1) return _activeIndex
	const zeroIndex = [...swiper.slides].findIndex(slide => slide.progress === 0)
	return (zeroIndex !== -1) ? zeroIndex : _activeIndex
}
