import effectInit from './lib/effect-init.js'
import effectTarget from './lib/effect-target.js'
import effectVirtualTransitionEnd from './lib/effect-virtual-transition-end.js'

export default function EffectClip({ swiper, extendParams, on }) {
	
	extendParams({ clipEffect: { transformEl: null } })

	const setTranslate = () => {
		
		const { slides } = swiper
		const params = swiper.params.clipEffect

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
				if (Math.abs(progress) > 1) return -1
				if (progress === 1) return 0
				if (progress > -1 && progress < 0) return 0
				if (progress >= 0) return 1
				return -1
			})()

			const cssBound = (bound) => (bound * 100).toFixed(2)
			const rightClipPath = (cssBound) => `polygon(0% 0%, ${100-cssBound}% 0%, ${100-cssBound}% 100%, 0% 100%)`
			const leftClipPath = (cssBound) => `polygon(${cssBound}% 0%, 100% 0%, 100% 100%, ${cssBound}% 100%)`

			const slideClipPath = (() => {
				if (Math.abs(progress) > 1) return rightClipPath(cssBound(1))
				if (progress >= 0 && progress <= 1) return rightClipPath(cssBound(progress))
				if (progress <= 0 && progress >= -1) return leftClipPath(cssBound(-progress))
			})()

			effectTarget(params, $slide)
				.css({ zIndex, clipPath: slideClipPath })
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
