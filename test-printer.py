import serial
import time

s = serial.Serial('/dev/cu.usbserial-BG04PRQC', 9600, timeout=2)
time.sleep(2)

s.write(b'\x1b\x40')
time.sleep(0.5)

width_bytes = 48
height_dots = 24
data = b'\xff' * width_bytes * height_dots

cmd = (b'\x1d\x76\x30\x00'
       + bytes([width_bytes & 0xff, width_bytes >> 8])
       + bytes([height_dots & 0xff, height_dots >> 8])
       + data)

s.write(cmd)
s.write(b'\n\n\n')
s.flush()

time.sleep(3)
s.close()
print('done')
