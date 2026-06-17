using System;
using System.Drawing;
using System.Drawing.Drawing2D;

class Program {
    static void Main() {
        int size = 256;
        using (var bmp = new Bitmap(size, size)) {
            using (var g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.Clear(Color.FromArgb(10, 14, 23));
                
                using (var brush = new LinearGradientBrush(
                    new Rectangle(0, 0, size, size),
                    Color.FromArgb(0, 206, 209),
                    Color.FromArgb(0, 180, 184),
                    LinearGradientMode.ForwardDiagonal)) {
                    
                    var font = new Font("Segoe UI Symbol", 140, FontStyle.Bold);
                    var text = "";
                    var textSize = g.MeasureString(text, font);
                    var x = (size - textSize.Width) / 2;
                    var y = (size - textSize.Height) / 2 - 10;
                    
                    g.DrawString(text, font, brush, x, y);
                }
            }
            bmp.Save("D:\\lhd054\\build\\icon.png", System.Drawing.Imaging.ImageFormat.Png);
            bmp.Save("D:\\lhd054\\build\\icon.ico", System.Drawing.Imaging.ImageFormat.Icon);
        }
        Console.WriteLine("Icon created successfully!");
    }
}
