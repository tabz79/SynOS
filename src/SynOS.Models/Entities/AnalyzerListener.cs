using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class AnalyzerListener
    {
        [Key]
        public Guid AnalyzerListenerId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid AnalyzerId { get; set; }

        [Required]
        [StringLength(50)]
        public string Protocol { get; set; } = "ASTM"; // ASTM, HL7, CustomCSV

        [StringLength(20)]
        public string ConnectionMode { get; set; } = "TcpServer"; // TcpServer, TcpClient, SerialCom, FolderWatcher

        public int Port { get; set; } = 5000;

        [StringLength(50)]
        public string? HostIpAddress { get; set; } // For TcpClient mode

        [StringLength(20)]
        public string? SerialPortName { get; set; } = "COM1"; // e.g. COM1, COM2

        public int BaudRate { get; set; } = 9600;
        public int DataBits { get; set; } = 8;
        public string Parity { get; set; } = "None"; // None, Odd, Even, Mark, Space
        public string StopBits { get; set; } = "One"; // One, Two, OnePointFive
        public string Handshake { get; set; } = "None"; // None, RequestToSend, RequestToSendXOnXOff

        [StringLength(260)]
        public string? WatchFolderPath { get; set; } // e.g. C:\SynOS_Files\AnalyzerDrop

        [StringLength(30)]
        public string WorklistMode { get; set; } = "Unidirectional"; // Unidirectional, BidirectionalHostQuery

        public bool IsActive { get; set; } = true;
    }
}
