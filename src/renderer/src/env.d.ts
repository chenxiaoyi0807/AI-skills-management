/// <reference types="electron-vite/node" />

// CSS Modules 类型声明
declare module '*.module.css' {
    const classes: Record<string, string>
    export default classes
}

declare module '*.module.scss' {
    const classes: Record<string, string>
    export default classes
}

// 图片资源类型声明
declare module '*.png' {
    const src: string
    export default src
}

declare module '*.svg' {
    const src: string
    export default src
}

declare module '*.webp' {
    const src: string
    export default src
}

declare module '*.jpg' {
    const src: string
    export default src
}
