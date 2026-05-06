'use client'

import Image, { type ImageProps } from 'next/image'
import { useState, useEffect } from 'react'

const FALLBACK_SRC = '/image-fallback.svg'

type FallbackImageProps = Omit<ImageProps, 'src'> & {
  src?: string | null
  fallbackSrc?: string
}

function isValidImageSrc(src: string | null | undefined): boolean {
  if (!src) return false
  // Must be an absolute URL (http/https) or a root-relative path starting with /
  return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')
}

export default function FallbackImage({ src, fallbackSrc = FALLBACK_SRC, alt, ...props }: FallbackImageProps) {
  const safeSrc = isValidImageSrc(src) ? src! : fallbackSrc
  const [imgSrc, setImgSrc] = useState<string>(safeSrc)

  useEffect(() => {
    setImgSrc(isValidImageSrc(src) ? src! : fallbackSrc)
  }, [src, fallbackSrc])

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc(fallbackSrc)}
    />
  )
}
