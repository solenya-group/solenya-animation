import { VLifecycle } from 'solenya'
import { forceRenderStyles } from "typestyle"

export type Orientation = "horizontal"|"vertical"
export type Direction = "forwards"|"backwards"

export const defaultDuration = 700

export interface TransitionChildrenProps {    
    /** Whether the children are oriented horiontally or vertically. Defaults to "vertical" */
    orientation?: Orientation

    /** The duration of the animation */
    duration?: number,

    /** The direction, either "forwards" or "backwards" - useful for carousel animations. If not specified then items entering and exiting are expanded and collapsed. */
    direction?: Direction

    /** Whether to reset the scroll position to zero. Useful for full page animations. */
    scrollToStart?: boolean,

    /** The animation threshold in pixels. Defaults to 5. */
    animationThreshold?: number
}

type CommonRect = DOMRect | ClientRect

type ChangeRect = {
    before: CommonRect
    after: CommonRect
}

interface IPoint {x: number, y: number }

type ChangeRange =
{
    begin: number,
    end: number
}

interface PseudoElement extends HTMLElement {    
    state_transitionChildren?: PseudoElement[]
    state_transitionScroll?: number
    state_prevBounds?: CommonRect
    state_transitionPositionStyle?: string | null
    removing?: boolean
}

export function transitionChildren (props: TransitionChildrenProps = {}): VLifecycle
{
    const duration = props.duration || defaultDuration
    const orientation = props.orientation || "vertical"
    const animationThreshold = props.animationThreshold || 5

    return {                       
        onBeforeUpdate (el: PseudoElement)
        {
            forceRenderStyles()            
            const children = el.state_transitionChildren = childElements (el)
            children.forEach (kid => {
                kid.state_prevBounds = kid.getBoundingClientRect()       
            })
            el.state_transitionScroll = orientation == "horizontal" ? document.documentElement.scrollLeft : document.documentElement.scrollTop           
        },
        onUpdated (el: PseudoElement)
        {    
            forceRenderStyles()

            const prevKids = el.state_transitionChildren!

            const stableKids = prevKids.filter (kid => kid.removing == null)                                    
            const inKids = childElements (el).filter(kid => prevKids.indexOf (kid) == -1)
            const outKids = prevKids.filter (kid => kid.removing == true)
           
            stableKids.forEach (kid => animateBoundsChange (kid, duration, animationThreshold))

            if (! inKids.length && ! outKids.length)
                return           

            const outSize = sum (outKids, c => size (c.state_prevBounds!, orientation))
            const inSize = sum (inKids, c => size (c.getBoundingClientRect(), orientation))
            const scrollBy = ! props.direction ? 0 : el.state_transitionScroll! + (props.direction == "forwards" ? -outSize : inSize)

            inKids.forEach (kid => {                
                kid.animate (
                    ! props.direction ?
                        scaleAnimation (orientation, { begin: 0, end: 1 }, { begin: 0, end: 1 }) :
                        slideAnimation (orientation, { begin: -scrollBy, end: 0 }, {begin: 0, end: 1 }),
                    { duration: duration, easing: 'ease-out' }
                )                
            })                           
            
            outKids.forEach (kid =>
            {       
                if (! el.state_transitionPositionStyle)
                    el.state_transitionPositionStyle = el.style.position
                
                el.style.position = "relative"
                kid.style.position = ! props.direction || ! props.scrollToStart ? "absolute" : "fixed"                                 
                kid.style.left = "0px"
                kid.style.top = "0px"
                kid.style.width = kid.state_prevBounds!.width + "px"
                kid.style.height = kid.state_prevBounds!.height + "px"
                el.insertBefore (kid, null)                
                var d = distanceToOrigin (getBoundsChange (kid))
                kid.style.left = `${-d.x}px` // note: must use left/top not translate cause of IE stuttering
                kid.style.top = `${-d.y}px`                                
                                
                const anim = kid.animate (
                    ! props.direction ?
                        scaleAnimation (orientation, { begin: 1, end: 0}, { begin: 1, end: 0 }) :
                        slideAnimation (orientation, { begin: 0, end: scrollBy }, { begin: 1, end: 0 })
                    ,
                    { duration: duration, easing: 'ease-out' }
                ) 
                anim.onfinish = () => {
                    if (kid.parentElement)
                        kid.parentElement.removeChild (kid)
                    el.style.position = el.state_transitionPositionStyle!                    
                    el.state_transitionPositionStyle = undefined
                }
            })

            if (props.scrollToStart) 
                window.scrollTo (0,0) 
        }                    
    }
}

const distanceToOrigin = (r: ChangeRect) => {
    return {
        x: r.after.left - r.before.left,
        y: r.after.top - r.before.top   
    }
}

const getBoundsChange = (el: PseudoElement) => ({
    before: el.state_prevBounds!,
    after: el.getBoundingClientRect()                    
})

export function animateBoundsChange (el: PseudoElement, duration: number, flipThreshold: number)
{      
    const rect = getBoundsChange (el)
    const distance = distanceToOrigin (rect)
    const changes = [
        ...[distance.x, distance.y],
        ...[rect.after.width - rect.before.width, rect.after.height - rect.before.height]
    ]

    if (! any (changes, v => Math.abs (v) > flipThreshold))
        return

    const transformKeyframes = <Keyframe[]> [
        { transform: `translate(${-distance.x}px,${-distance.y}px)` },
        { transform: `translate(0px,0px)` }
    ]

    const sizeKeyframes = <Keyframe[]> [
        { width: `${rect.before.width}px`, height: `${rect.before.height}px` },
        { width: `${rect.after.width}px`, height: `${rect.after.height}px` }
    ]

    const keyframes = [
        {...transformKeyframes[0], ...sizeKeyframes[0]},
        {...transformKeyframes[1], ...sizeKeyframes[1]}
    ]
    
    el.animate (keyframes, { duration: duration, easing: 'ease-out' })
}

export const size = (r: CommonRect, o: Orientation) =>
    o == "horizontal" ? r.width : r.height

export const start = (r: CommonRect, o: Orientation) =>
    o == "horizontal" ? r.left : r.top

export const startOfPoint = (p: IPoint, o: Orientation) =>
    o == "horizontal" ? p.x : p.y

export const getTranslate = (n: number, o: Orientation) =>
    `translate${o == "horizontal" ? "X" : "Y"}(${n}px)`

export const getScale = (n: number, o: Orientation) =>
    `scale${o == "horizontal" ? "X" : "Y"}(${n})`

export const childElements = (el: Element) =>
    Array.from(el.childNodes).map(c => c as PseudoElement)

export const scaleAnimation = (o: Orientation, scale: ChangeRange, opacity: ChangeRange) => <Keyframe[]> [
    { opacity: ""+opacity.begin, transformOrigin: "0px 0px", transform: getScale (scale.begin, o)},
    { opacity: ""+opacity.end, transformOrigin: "0px 0px", transform: getScale (scale.end, o) }
]

export const slideAnimation = (o: Orientation, translate: ChangeRange, opacity: ChangeRange) => <Keyframe[]> [
     { opacity: ""+opacity.begin, transform: getTranslate (translate.begin, o) },
     { opacity: ""+opacity.end, transform: getTranslate (translate.end, o) }
]

const sum = function <T>(source: T[], mapper: (val: T) => number) {
    var total = 0
    for (var x of source)
        total += mapper(x)
    return total
}

const any = function <T>(source: T[], filter: (val: T) => boolean) {
    for (var x of source)
        if (filter (x))
            return true
    return false
}