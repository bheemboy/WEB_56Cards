export interface CardProps {
    card: string
    scale: number
    rotation: number
    translation: number
    oncardplayed: () => void
}

export interface CardsDeckProps { 
    cards: string[]
    scale?: number 
    percardrotation?: number 
    percardtranslation?: number 
}
