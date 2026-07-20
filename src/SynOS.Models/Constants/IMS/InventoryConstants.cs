using System;

namespace SynOS.Models.Constants.IMS
{
    public static class InventoryConstants
    {
        public static class ServiceAreas
        {
            public const string Laboratory = "Laboratory";
            public const string Radiology = "Radiology";
            public static readonly string[] All = { Laboratory, Radiology };
        }

        public static class Modalities
        {
            public const string MRI = "MRI";
            public const string CT = "CT";
            public const string XRay = "X-Ray";
            public const string Ultrasound = "Ultrasound";
            public const string Mammography = "Mammography";
            public const string DEXA = "DEXA";
            public static readonly string[] All = { MRI, CT, XRay, Ultrasound, Mammography, DEXA };
        }
    }
}
