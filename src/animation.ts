import { VLifecycle } from 'solenya'
import { forceRenderStyles } from "typestyle"

export type Orientation = "horizontal"|"vertical"
export type Direction = "forwards"|"backwards"

export type CommonElement = HTMLElement | SVGElement

export interface TransitionChildProps {
    orientation: Orientation
    direction: Direction
    duration?: number
    scrollToZero?: boolean
}

type SlideState =
{
    a: CommonElement
    aRect: ClientRect
    offsetX: number
    offsetY: number
}

export const defaultDuration = 700

export function transitionChild (props: TransitionChildProps) : VLifecycle
{            
    const orientation = props.orientation
    const direction = props.direction
    const duration = props.duration || defaultDuration
    const scrollToZero = props.scrollToZero || false
    
    return {        
        onBeforeUpdate (el)
        {
            if (! (el.firstChild instanceof HTMLElement))
                return

            forceRenderStyles()
            const a = el.firstChild as HTMLElement
            el["state_slide"] = <SlideState>{
                a,                
                aRect : a.getBoundingClientRect(),
                offsetX: a.offsetLeft,
                offsetY: a.offsetTop,
            }            
        },
        onUpdated (el, attrs)
        {       
            if (! (el.firstChild instanceof HTMLElement))
                return

            const b = el.firstChild as CommonElement
            const {a, aRect, offsetX, offsetY } = el["state_slide"] as SlideState                        
            if (a == b)
                return
            const offset = orientation == "horizontal" ? offsetX : offsetY
                       
            const bRect = b.getBoundingClientRect()

            const slideAmount = direction == "forwards" ?
                -size (aRect, orientation) :
                size (bRect, orientation)

            const slideAmountAdj =
                start (aRect, orientation) >= 0 ?
                    slideAmount :
                    slideAmount - (start (aRect, orientation) - offset)
                    
            a.style.position = "absolute"
            a.style.left = a.style.top = "0px"
            a.style.width = "" + aRect.width + "px"
            a.style.height = "" + aRect.height + "px"            
            a.style.transform = getTranslate (slideAmount, orientation)
            a.style.opacity = '0'            
            el.insertBefore (a, null)                        

            const anim = el.animate (<Keyframe[]>[{transform: getTranslate(-slideAmountAdj, orientation)}, { transform: 'none' }], { duration, easing: 'ease-out' })          
            a.animate (<Keyframe[]>[{ opacity: "1" }, { opacity:"0" }], { duration, easing: 'ease-out' }) 
            b.animate (<Keyframe[]>[{ opacity: "0" }, { opacity:"1" }], { duration, easing: 'ease-out' }) 
            
            removeOnFinish (anim, a)    

            if (scrollToZero) 
                window.scrollTo (0,0)              
        } 
    }
}

export interface TransitionChildrenProps {    
    orientation?: Orientation
    duration?: number
}

export function transitionChildren (props: TransitionChildrenProps = {}): VLifecycle
{
    const duration = props.duration || defaultDuration
    const orientation = props.orientation || "vertical"

    return {                       
        onBeforeUpdate (el) {               
            let els = el["state_slideChildren"] = childElements (el)
            els.forEach (c => measure(c))
        },
        onUpdated (el, attrs) {            
            let previousEls = (<CommonElement[]>el["state_slideChildren"])

            const stableElements = previousEls.filter (x => x["removing"] == null)
            stableElements.forEach (c => flip (c, duration))
                        
            const incomingElements = childElements (el).filter(e => previousEls.indexOf (e) == -1)
            incomingElements.forEach (c =>
                (<CommonElement>c).animate (<Keyframe[]>[
                { transformOrigin: "0px 0px", transform: getScale (0, orientation)},
                { transformOrigin: "0px 0px", transform: 'none' }
            ],
                { duration: duration, easing: 'ease-out' }
            ))

            if (el instanceof HTMLElement) {            
                const outgoingElements = previousEls.filter (c => c["removing"] == true)
                outgoingElements.forEach (c => {                                                                
                    const first = c ["state_flip_rect"] as ClientRect                  
                    el.style.position = "relative"               
                    c.style.position = "absolute"
                    el!.insertBefore (c, null)
                    const last = el.getBoundingClientRect()     
                    var invertX = first.left - last.left
                    var invertY = first.top - last.top      
                    c.style.top = "" + invertY + "px"
                    c.style.left = "" + invertX + "px"
                    const anim = c.animate (<Keyframe[]>[
                        { transformOrigin: "0px 0px", transform: getScale (1, orientation), opacity: "1" },
                        { transformOrigin: "0px 0px", transform: getScale (0, orientation), opacity: "0" }
                    ],
                        { duration: duration, easing: 'ease-out' }
                    ) 
                    removeOnFinish (anim, c)                
                })           
            }
        }                    
    }
}

export function measure(el: CommonElement) {        
    el ["state_flip_rect"] = el.getBoundingClientRect()    
}

export function flip (el: CommonElement, duration: number) {            
    var first = el["state_flip_rect"] as ClientRect
    var last = el.getBoundingClientRect()                    
    var invertX = first.left - last.left
    var invertY = first.top - last.top                        
    var player = el.animate(<Keyframe[]>
        [
            { transform: `translate(${invertX}px,${invertY}px)` },
            { transform: 'none' }
        ],
        { duration: duration, easing: 'ease-out' }
    )
}

export function removeOnFinish(anim: Animation, child: Element) {
    anim.onfinish = () => {
        if (child.parentElement)
            child.parentElement.removeChild (child)
    }
}

export const size = (r: ClientRect | DOMRect, orientation: Orientation) =>
    orientation == "horizontal" ? r.width : r.height

export const start = (r: ClientRect | DOMRect, orientation: Orientation) =>
    orientation == "horizontal" ? r.left : r.top

export const getTranslate = (n: number, orientation: Orientation) =>
    `translate${orientation == "horizontal" ? "X" : "Y"}(${n}px)`

export const getScale = (n: number, orientation: Orientation) =>
    `scale${orientation == "horizontal" ? "X" : "Y"}(${n})`

export const childElements = (el: Element) =>
    Array.from(el.childNodes).map(c => c as CommonElement)