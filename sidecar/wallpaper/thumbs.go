package wallpaper

import (
	"bufio"
	"fmt"
	"hash/fnv"
	"image"
	"image/jpeg"
	_ "image/jpeg"
	_ "image/png"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"

	"niri-settings-sidecar/protocol"
)

const (
	thumbMaxDim  = 512
	thumbQuality = 82
	thumbWorkers = 6
)

// thumbCacheDir returns the directory where generated thumbnails are stored.
func thumbCacheDir(home string) string {
	return filepath.Join(home, ".cache", "dotfiles", "thumbs")
}

// ThumbnailPathFor returns a deterministic cache path for a source image.
func ThumbnailPathFor(home, src string) string {
	h := fnv.New64a()
	_, _ = h.Write([]byte(src))
	return filepath.Join(thumbCacheDir(home), fmt.Sprintf("%016x.jpg", h.Sum64()))
}

// ensureThumbnail makes sure a fresh thumbnail exists for src and returns its
// path. It regenerates when the thumbnail is missing or older than the source.
func ensureThumbnail(home, src string) (string, error) {
	dst := ThumbnailPathFor(home, src)
	if dstInfo, err := os.Stat(dst); err == nil {
		if srcInfo, err := os.Stat(src); err == nil && !dstInfo.ModTime().Before(srcInfo.ModTime()) {
			return dst, nil
		}
	}
	if err := os.MkdirAll(thumbCacheDir(home), 0o755); err != nil {
		return "", err
	}
	if err := generateThumbnail(src, dst); err != nil {
		return "", err
	}
	return dst, nil
}

func generateThumbnail(src, dst string) error {
	ext := strings.ToLower(filepath.Ext(src))
	if ext == ".webp" || ext == ".gif" || ext == ".avif" {
		return generateThumbnailFFmpeg(src, dst)
	}
	if err := encodeThumbnailNative(src, dst); err != nil {
		if ext == ".jpg" || ext == ".jpeg" || ext == ".png" {
			return err
		}
		// Unknown extension: try ffmpeg before giving up.
		if ffmpegErr := generateThumbnailFFmpeg(src, dst); ffmpegErr == nil {
			return nil
		}
		return err
	}
	return nil
}

func generateThumbnailFFmpeg(src, dst string) error {
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		return fmt.Errorf("ffmpeg not available for %s", src)
	}
	vf := fmt.Sprintf("scale='min(%d,iw)':-2", thumbMaxDim)
	cmd := exec.Command(ffmpeg, "-y", "-loglevel", "error", "-i", src, "-frames:v", "1", "-vf", vf, "-q:v", "4", dst)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("ffmpeg failed for %s: %v: %s", src, err, strings.TrimSpace(string(out)))
	}
	return nil
}

func encodeThumbnailNative(src, dst string) error {
	f, err := os.Open(src)
	if err != nil {
		return err
	}
	defer f.Close()

	img, _, err := image.Decode(bufio.NewReaderSize(f, 1<<20))
	if err != nil {
		return fmt.Errorf("decode %s: %w", src, err)
	}

	out := downscaleArea(img, thumbMaxDim)
	tmp := dst + ".tmp"
	tf, err := os.Create(tmp)
	if err != nil {
		return err
	}
	if err := jpeg.Encode(bufio.NewWriter(tf), out, &jpeg.Options{Quality: thumbQuality}); err != nil {
		tf.Close()
		os.Remove(tmp)
		return err
	}
	if err := tf.Close(); err != nil {
		os.Remove(tmp)
		return err
	}
	if err := os.Rename(tmp, dst); err != nil {
		os.Remove(tmp)
		return err
	}
	return nil
}

// downscaleArea box-filters an image so its longest edge is at most maxDim,
// touching each source pixel exactly once.
func downscaleArea(img image.Image, maxDim int) image.Image {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= 0 || h <= 0 {
		return image.NewRGBA(image.Rect(0, 0, 1, 1))
	}
	longest := w
	if h > longest {
		longest = h
	}
	if longest <= maxDim {
		return img
	}
	scale := float64(maxDim) / float64(longest)
	nw := int(float64(w)*scale + 0.5)
	nh := int(float64(h)*scale + 0.5)
	if nw < 1 {
		nw = 1
	}
	if nh < 1 {
		nh = 1
	}
	dst := image.NewRGBA(image.Rect(0, 0, nw, nh))
	for y := 0; y < nh; y++ {
		sy0 := float64(y) * float64(h) / float64(nh)
		sy1 := float64(y+1) * float64(h) / float64(nh)
		for x := 0; x < nw; x++ {
			sx0 := float64(x) * float64(w) / float64(nw)
			sx1 := float64(x+1) * float64(w) / float64(nw)
			var rs, gs, bs, as float64
			var count float64
			for sy := int(sy0); float64(sy) < sy1 && sy < h; sy++ {
				for sx := int(sx0); float64(sx) < sx1 && sx < w; sx++ {
					r, g, bl, a := img.At(b.Min.X+sx, b.Min.Y+sy).RGBA()
					rs += float64(r >> 8)
					gs += float64(g >> 8)
					bs += float64(bl >> 8)
					as += float64(a >> 8)
					count++
				}
			}
			if count == 0 {
				continue
			}
			off := dst.PixOffset(x, y)
			dst.Pix[off+0] = uint8(rs/count + 0.5)
			dst.Pix[off+1] = uint8(gs/count + 0.5)
			dst.Pix[off+2] = uint8(bs/count + 0.5)
			dst.Pix[off+3] = uint8(as/count + 0.5)
		}
	}
	return dst
}

// generateThumbnailsConcurrent fills in missing/stale thumbnails for all given
// sources using a bounded worker pool and returns how many were generated.
func generateThumbnailsConcurrent(home string, sources []string) int {
	work := make(chan string)
	var generated atomic.Int64
	var wg sync.WaitGroup

	workers := thumbWorkers
	if n := runtime.NumCPU(); n < workers {
		workers = n
	}
	if workers < 1 {
		workers = 1
	}

	for range workers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for src := range work {
				if _, err := ensureThumbnail(home, src); err == nil {
					generated.Add(1)
				}
			}
		}()
	}

	for _, src := range sources {
		work <- src
	}
	close(work)
	wg.Wait()
	return int(generated.Load())
}

// HandleEnsureThumbs generates thumbnails for every known wallpaper.
func HandleEnsureThumbs(_ map[string]any) {
	home := protocol.HomeDir("USER_DIR_ERROR")
	if home == "" {
		return
	}
	catalog := Build(home)
	sources := make([]string, 0, len(catalog.Items))
	for _, w := range catalog.Items {
		sources = append(sources, w.Path)
	}
	generated := generateThumbnailsConcurrent(home, sources)
	protocol.WriteResponse(map[string]any{
		"generated": generated,
		"total":     catalog.Total,
	})
}
