/*
	Hacky workaround to get swiper progress during transition.
	Implemented to let pause transitions.
*/

import Swiper from 'swiper/bundle'

/**
 * Parse boundaries of clip-path css property.
 * Accepts only properties defined as polygon with percentage values.
 * 
 * @example
 * ```js
 * // ['92.9199','0','100','0','100','100','92.9199','100']
 * parsePolygonClipPathCSS('polygon(92.9199% 0%, 100% 0%, 100% 100%, 92.9199% 100%)')
 * ```
 * @param {String} clipPathString CSS clip-path property value.
 * @returns {Array<String>} Array of 8 string values (2 boundaries for each corner).
 */
function parsePolygonClipPathCSS(clipPathString) {
	const r = String.raw
	// Regex string for floating number
	const numberRS = r`[+-]?(?:[0-9]*[.])?[0-9]+`
	// Regex string for polygon corner
	const cornerRS = r`(${numberRS})%\s(${numberRS})%`
	// Regex string for polygon arguments
	const argumentsRS = r`${cornerRS},\s${cornerRS},\s${cornerRS},\s${cornerRS}`
	// Complete regex expression
	const regex = new RegExp(r`polygon\(${argumentsRS}\)`)
	// Should return 8 matches (or null)
	return clipPathString.match(regex)
}

/**
 * Estimated transition progress based on clip-path property of active slide.
 * @param {Swiper} swiper Swiper instance.
 * @returns {Object} Transition progress (from 0 to 1) and static bound (left / right).
 */
export function transitionProgress(swiper) {
	const activeSlide = $(swiper.slides[swiper.activeIndex])
	const clipPath = activeSlide.css('clipPath')
	const bounds = parsePolygonClipPathCSS(clipPath) || ['0','0','100','0','100','100','0','100']
	const bindL = bounds[1] === '0' && bounds[7] === '0'
	const bindR = bounds[3] === '100' && bounds[5] === '100'
	if (bindL && bindR) return { bind: ['L', 'R'], progress: 0 }
	if (bindL) return { bind: ['L'], progress: Number(bounds[3]) / 100 }
	if (bindR) return { bind: ['R'], progress: 1 - (Number(bounds[1]) / 100) }
	return { bind: [ ], progress: NaN }	// !bindL && !bindR – should not happen
}

/**
 * Calculate progress during transition. Uses CSS of active slide.
 * This value differs from Swiper progress significantly during transitions.
 * @param {Swiper} swiper Swiper instance.
 * @returns {Number} Estimated progress (0 to 1).
 */
export function estimatedProgress(swiper) {

	const segment = 1 / (swiper.slides.length - 1)
	const activeIndex = swiper.activeIndex
	const sprogress = segment * activeIndex
	const tprogress = transitionProgress(swiper)

	/* By the end of transition, active slide must fit the wrapper. */
	if (tprogress.progress === 0) return sprogress
	const kbind = tprogress.bind.includes('L') ? 1 : -1
	return sprogress + (1 - tprogress.progress) * segment * kbind

}
