import os
import json
from gtts import gTTS
from pydub import AudioSegment
import time
import unicodedata
import re

# Konfigurasi
INPUT_JSON = "data/vocabulary.json"  # File JSON kosakata
OUTPUT_DIR = "audio"                # Folder output audio
LANGUAGE = "ja"                     # Kode bahasa Jepang
DELAY_BETWEEN_REQUESTS = 1          # Delay antar request ke gTTS (detik)

def sanitize_filename(filename):
    """Membersihkan nama file dari karakter tidak valid"""
    # Normalisasi unicode (untuk handling karakter khusus)
    filename = unicodedata.normalize('NFKD', filename).encode('ascii', 'ignore').decode('ascii')
    # Hapus karakter tidak aman
    filename = re.sub(r'[^\w\s-]', '', filename).strip().lower()
    # Ganti spasi dengan underscore
    filename = re.sub(r'[-\s]+', '_', filename)
    return filename

def generate_audio_files():
    """Generate file audio untuk kosakata yang belum ada"""
    try:
        # Baca file JSON
        with open(INPUT_JSON, "r", encoding="utf-8") as f:
            vocabulary = json.load(f)
        
        # Buat folder output jika belum ada
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        # Variabel untuk tracking progress
        total_words = len(vocabulary)
        generated_count = 0
        skipped_count = 0
        error_count = 0
        
        print(f"\nMemulai proses generasi audio untuk {total_words} kosakata...\n")
        
        for index, word in enumerate(vocabulary, 1):
            try:
                text = word["hiragana"]  # Gunakan hiragana untuk pengucapan
                romaji = word["romaji"]
                
                # Bersihkan nama file
                safe_filename = sanitize_filename(romaji) + ".mp3"
                output_path = os.path.join(OUTPUT_DIR, safe_filename)
                
                # Skip jika file sudah ada
                if os.path.exists(output_path):
                    print(f"{index}/{total_words} [SKIP] Audio untuk '{romaji}' sudah ada")
                    skipped_count += 1
                    continue
                
                # Generate audio dengan gTTS
                print(f"{index}/{total_words} [GENERATE] Membuat audio untuk: {text} ({romaji})")
                tts = gTTS(text=text, lang=LANGUAGE, slow=False)
                tts.save(output_path)
                
                # Optimasi audio dengan pydub
                try:
                    audio = AudioSegment.from_mp3(output_path)
                    audio = audio.normalize()  # Normalisasi volume
                    audio = audio.set_frame_rate(22050)  # Set frame rate optimal
                    audio.export(output_path, format="mp3", bitrate="64k")
                except Exception as audio_error:
                    print(f"  Peringatan: Gagal mengoptimasi audio - {str(audio_error)}")
                
                # Update path audio di JSON
                word["audio"] = os.path.join(OUTPUT_DIR, safe_filename).replace("\\", "/")
                generated_count += 1
                
                # Delay untuk menghindari rate limiting
                if index < total_words:
                    time.sleep(DELAY_BETWEEN_REQUESTS)
                    
            except Exception as e:
                print(f"{index}/{total_words} [ERROR] Gagal memproses '{word.get('kanji', '?')}': {str(e)}")
                error_count += 1
                # Delay lebih panjang jika error
                time.sleep(5)
        
        # Simpan JSON dengan path audio yang diperbarui
        with open(INPUT_JSON, "w", encoding="utf-8") as f:
            json.dump(vocabulary, f, ensure_ascii=False, indent=2)
        
        # Ringkasan hasil
        print("\n===== RINGKASAN HASIL =====")
        print(f"Total kosakata diproses: {total_words}")
        print(f"Audio baru di-generate: {generated_count}")
        print(f"Audio yang sudah ada: {skipped_count}")
        print(f"Error: {error_count}")
        print("Proses generasi audio selesai!\n")
        
    except Exception as e:
        print(f"\nERROR: Gagal menjalankan proses generasi audio - {str(e)}")

if __name__ == "__main__":
    generate_audio_files()