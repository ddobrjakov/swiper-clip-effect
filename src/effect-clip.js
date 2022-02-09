import effectInit from './lib/effect-init.js'
import effectTarget from './lib/effect-target.js'
import effectVirtualTransitionEnd from './lib/effect-virtual-transition-end.js'

export default function EffectClip({ swiper, extendParams, on }) {
	
	extendParams({ clipEffect: { transformEl: null } })

	const setTranslate = () => {
		
		const { slides } = swiper
		const params = swiper.params.clipEffect

		const { active, second } = clipped(swiper)
		const activeProgress = swiper.slides.eq(active)[0].progress

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
			const rightClipPath = (cssBound) => `polygon(0% 0%, ${100-cssBound}% 0%, ${100-cssBound}% 100%, 0% 100%)`
			const leftClipPath = (cssBound) => `polygon(${cssBound}% 0%, 100% 0%, 100% 100%, ${cssBound}% 100%)`

			const slideClipPath = (() => {
				if (i === active && activeProgress >= 0) return rightClipPath(cssBound(activeProgress))
				if (i === active && activeProgress <= 0) return leftClipPath(cssBound(-activeProgress))
				if (i === second && activeProgress >= 0) return leftClipPath(cssBound(1-activeProgress))
				if (i === second && activeProgress <= 0) return rightClipPath(cssBound(1+activeProgress))
				if (progress >= activeProgress) return rightClipPath(cssBound(1))
				if (progress <= activeProgress) return leftClipPath(cssBound(1))
			})()

			effectTarget(params, $slide)
				.css({ zIndex: zIndex, clipPath: slideClipPath })
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
 * Find two slides that need to be clipped.
 * @param {Swiper} swiper Swiper instance.
 * @returns Active slide and second slide.
 */
function clipped(swiper) {
	const active = activeIndex(swiper)
	const activeProgress = swiper.slides.eq(active)[0].progress
	var second = [...swiper.slides].findIndex((slide, index) => 
		index != active && (activeProgress >= 0
			? slide.progress >= -1 && slide.progress <= 0
			: slide.progress >= 0 && slide.progress <= 1))
	if (second === -1)
		second = activeProgress >= 0
			? original(swiper, original(swiper, swiper.slides.length - 1) + 1)
			: original(swiper, original(swiper, 0) - 1)
	return { active, second }
}

/**
 * Get index of active Swiper slide.
 * @description Sometimes swiper.activeIndex returns a slide with progress outside [-1, 1] range.
 * Not sure if this is intended, but it's undesired and addressed in this function.
 * @param {Swiper} swiper Swiper instance.
 */
function activeIndex(swiper) {
	const _activeIndex = swiper.activeIndex
	const _activeProgress = swiper.slides.eq(_activeIndex)[0].progress
	if (Math.abs(_activeProgress) <= 1) return _activeIndex
	const zeroIndex = [...swiper.slides].findIndex(slide => slide.progress === 0)
	console.log('zeroIndex', zeroIndex)
	return (zeroIndex !== -1) ? zeroIndex : _activeIndex
}
